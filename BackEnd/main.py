from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import asyncpg
from typing import Dict, List
import json
from datetime import datetime
import os
from uuid import uuid4
from dotenv import load_dotenv
from pathlib import Path

# .env 파일 로드
load_dotenv()

# FastAPI 앱 생성
app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 업로드 디렉토리 설정
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# 프론트엔드 빌드 파일 경로 설정
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = (BASE_DIR / ".." / "FrontEnd" / "dist").resolve()
INDEX_FILE = FRONTEND_DIST / "index.html"

print(f"📁 FRONTEND_DIST: {FRONTEND_DIST}")
print(f"📁 INDEX_FILE exists: {INDEX_FILE.exists()}")

# 프론트엔드 정적 파일 mount
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    print("⚠️  프론트엔드 dist 폴더가 존재하지 않습니다. 배포 전 빌드 필요")

# React SPA fallback
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # API, WebSocket 요청은 무시
    if full_path.startswith("api") or full_path.startswith("ws") or full_path.startswith("uploads"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return {"detail": "Frontend not built"}

# DB 환경 변수
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

clients: Dict[str, List[WebSocket]] = {}

# 모델 정의
class Message(BaseModel):
    room_id: str
    username: str
    content: str
    type: str
    created_at: str = None

class RegisterForm(BaseModel):
    name: str
    username: str
    password: str

class LoginForm(BaseModel):
    username: str
    password: str

# DB 연결
@app.on_event("startup")
async def startup():
    app.state.db = await asyncpg.create_pool(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT
    )

@app.on_event("shutdown")
async def shutdown():
    await app.state.db.close()

# WebSocket 채팅 처리
@app.websocket("/ws/{room_id}/{username}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, username: str):
    await websocket.accept()
    print(f"🟢 {username} joined room {room_id}")

    if room_id not in clients:
        clients[room_id] = []
    clients[room_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg_data = json.loads(data)
                content = msg_data.get("content", "")
                msg_type = msg_data.get("type", "text")
            except Exception as e:
                print("❌ 메시지 파싱 실패:", e)
                continue

            try:
                await app.state.db.execute(
                    """
                    INSERT INTO messages (room_id, username, content, type, created_at)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    room_id,
                    username,
                    content,
                    msg_type,
                    datetime.utcnow()
                )
            except Exception as e:
                print("❌ DB 저장 실패:", e)
                continue

            payload = {
                "sender": username,
                "content": content,
                "type": msg_type,
                "created_at": datetime.utcnow().isoformat()
            }

            disconnected = []
            for client in clients[room_id]:
                try:
                    await client.send_text(json.dumps(payload))
                except Exception:
                    disconnected.append(client)

            for dc in disconnected:
                clients[room_id].remove(dc)

    except WebSocketDisconnect:
        print(f"🔌 {username} disconnected from {room_id}")
        clients[room_id].remove(websocket)
        if not clients[room_id]:
            del clients[room_id]

# 메시지 저장
@app.post("/messages")
async def save_message(msg: Message):
    try:
        await app.state.db.execute(
            """
            INSERT INTO messages (room_id, username, content, type, created_at)
            VALUES ($1, $2, $3, $4, $5)
            """,
            msg.room_id,
            msg.username,
            msg.content,
            msg.type,
            msg.created_at or datetime.utcnow()
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 메시지 조회
@app.get("/messages/{room_id}")
async def get_messages(room_id: str):
    try:
        rows = await app.state.db.fetch(
            "SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC",
            room_id
        )
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 회원가입
@app.post("/register")
async def register_user(form: RegisterForm):
    try:
        await app.state.db.execute(
            """
            INSERT INTO users (name, username, password)
            VALUES ($1, $2, $3)
            """,
            form.name,
            form.username,
            form.password
        )
        return {"status": "success", "message": "회원가입 성공!"}
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 로그인
@app.post("/login")
async def login_user(form: LoginForm):
    user = await app.state.db.fetchrow("SELECT * FROM users WHERE username = $1", form.username)
    if not user:
        raise HTTPException(status_code=401, detail="아이디가 존재하지 않습니다.")
    if form.password != user["password"]:
        raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다.")
    return {"status": "success", "message": "로그인 성공!"}

# 아이디 중복 확인
@app.get("/check-username/{username}")
async def check_username(username: str):
    user = await app.state.db.fetchrow("SELECT * FROM users WHERE username = $1", username)
    if user:
        return {"status": "success", "message": f"사용자 {username} 존재"}
    raise HTTPException(status_code=404, detail=f"사용자 {username}가 존재하지 않습니다.")

# 파일 업로드
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as f:
            f.write(await file.read())
        return {"url": f"/uploads/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 실패: {str(e)}")

# 로컬 테스트 실행 (Render 배포 시 사용하지 않음)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
