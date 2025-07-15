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

app = FastAPI()

# 업로드 디렉토리 설정
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# 프론트엔드 정적 파일 (dist 폴더) 연결
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend" / "dist"

if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

# 404 fallback - React SPA 라우팅 대응
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    else:
        return {"detail": "Frontend not built"}

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PostgreSQL 환경 변수 로드
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

clients: Dict[str, List[WebSocket]] = {}

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
                query = """
                    INSERT INTO messages (room_id, username, content, type, created_at)
                    VALUES ($1, $2, $3, $4, $5)
                """
                await app.state.db.execute(
                    query,
                    room_id,
                    username,
                    content,
                    msg_type,
                    datetime.utcnow()
                )
            except Exception as e:
                print("❌ DB 저장 실패:", e)
                continue

            message_payload = {
                "sender": username,
                "content": content,
                "type": msg_type,
                "created_at": datetime.utcnow().isoformat()
            }

            disconnected = []
            for client in clients[room_id]:
                try:
                    await client.send_text(json.dumps(message_payload))
                except Exception:
                    disconnected.append(client)

            for dc in disconnected:
                clients[room_id].remove(dc)

    except WebSocketDisconnect:
        print(f"🔌 {username} disconnected from {room_id}")
        clients[room_id].remove(websocket)
        if not clients[room_id]:
            del clients[room_id]

@app.post("/messages")
async def save_message(msg: Message):
    query = """
        INSERT INTO messages (room_id, username, content, type, created_at)
        VALUES ($1, $2, $3, $4, $5)
    """
    try:
        await app.state.db.execute(
            query,
            msg.room_id,
            msg.username,
            msg.content,
            msg.type,
            msg.created_at or datetime.utcnow()
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/messages/{room_id}")
async def get_messages(room_id: str):
    query = "SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC"
    try:
        rows = await app.state.db.fetch(query, room_id)
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register")
async def register_user(form: RegisterForm):
    query = """
        INSERT INTO users (name, username, password)
        VALUES ($1, $2, $3)
    """
    try:
        await app.state.db.execute(query, form.name, form.username, form.password)
        return {"status": "success", "message": "회원가입 성공!"}
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
async def login_user(form: LoginForm):
    query = "SELECT * FROM users WHERE username = $1"
    user = await app.state.db.fetchrow(query, form.username)

    if user is None:
        raise HTTPException(status_code=401, detail="아이디가 존재하지 않습니다.")
    if form.password != user["password"]:
        raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다.")

    return {"status": "success", "message": "로그인 성공!"}

@app.get("/check-username/{username}")
async def check_username(username: str):
    query = "SELECT * FROM users WHERE username = $1"
    user = await app.state.db.fetchrow(query, username)

    if user:
        return {"status": "success", "message": f"사용자 {username} 존재"}
    else:
        raise HTTPException(status_code=404, detail=f"사용자 {username}가 존재하지 않습니다.")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        return {"url": f"/uploads/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 실패: {str(e)}")
