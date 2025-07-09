from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncpg
from typing import Dict, List
import json
from passlib.context import CryptContext
from datetime import datetime
import os
from uuid import uuid4

app = FastAPI()

# ✅ 정적 파일 서빙 (업로드한 이미지/영상 접근용)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ PostgreSQL 접속 정보
DB_USER = "chatuser"
DB_PASSWORD = "1234"
DB_NAME = "chatingsql"
DB_HOST = "localhost"
DB_PORT = "5432"

# ✅ 연결된 클라이언트 저장
clients: Dict[str, List[WebSocket]] = {}

# ✅ 비밀번호 암호화 설정 (현재 사용 X)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ✅ 메시지 구조
class Message(BaseModel):
    room_id: str
    username: str
    content: str
    is_image: bool = False

# ✅ 회원가입/로그인 폼 구조
class RegisterForm(BaseModel):
    name: str
    username: str
    password: str

class LoginForm(BaseModel):
    username: str
    password: str

# ✅ DB 연결 풀
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

# ✅ WebSocket 채팅 엔드포인트
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

            # JSON 파싱
            try:
                msg_data = json.loads(data)
                content = msg_data.get("content", "")
                is_image = msg_data.get("type") == "image"
            except Exception as e:
                print("❌ 메시지 파싱 실패:", e)
                continue

            # DB 저장
            try:
                insert_query = """
                    INSERT INTO messages (room_id, username, content, is_image)
                    VALUES ($1, $2, $3, $4)
                """
                await app.state.db.execute(insert_query, room_id, username, content, is_image)
            except Exception as e:
                print("❌ DB 저장 실패:", e)
                continue

            # 클라이언트에게 메시지 브로드캐스트
            message_payload = {
                "sender": username,
                "content": content,
                "type": "image" if is_image else "text",
                "created_at": datetime.now().isoformat()
            }

            disconnected_clients = []
            for client in clients[room_id]:
                try:
                    await client.send_text(json.dumps(message_payload))
                except Exception as e:
                    print("❌ 메시지 전송 실패:", e)
                    disconnected_clients.append(client)

            for dc in disconnected_clients:
                clients[room_id].remove(dc)

    except WebSocketDisconnect:
        print(f"🔌 {username} disconnected from {room_id}")
        clients[room_id].remove(websocket)
        if not clients[room_id]:
            del clients[room_id]

# ✅ 메시지 저장용 API
@app.post("/messages")
async def save_message(msg: Message):
    query = """
        INSERT INTO messages (room_id, username, content, is_image)
        VALUES ($1, $2, $3, $4)
    """
    try:
        await app.state.db.execute(query, msg.room_id, msg.username, msg.content, msg.is_image)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ 메시지 불러오기 API
@app.get("/messages/{room_id}")
async def get_messages(room_id: str):
    query = "SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC"
    try:
        rows = await app.state.db.fetch(query, room_id)
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ 회원가입 API
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

# ✅ 로그인 API
@app.post("/login")
async def login_user(form: LoginForm):
    query = "SELECT * FROM users WHERE username = $1"
    user = await app.state.db.fetchrow(query, form.username)

    if user is None:
        raise HTTPException(status_code=401, detail="아이디가 존재하지 않습니다.")
    if form.password != user["password"]:
        raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다.")

    return {"status": "success", "message": "로그인 성공!"}

# ✅ 사용자 존재 여부 확인 API
@app.get("/check-username/{username}")
async def check_username(username: str):
    query = "SELECT * FROM users WHERE username = $1"
    user = await app.state.db.fetchrow(query, username)

    if user:
        return {"status": "success", "message": f"사용자 {username} 존재"}
    else:
        raise HTTPException(status_code=404, detail=f"사용자 {username}가 존재하지 않습니다.")

# ✅ 파일 업로드 API (이미지, 영상 등)
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        return {"url": f"http://localhost:8000/uploads/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 실패: {str(e)}")
