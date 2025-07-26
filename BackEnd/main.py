from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import asyncpg
from typing import Dict, List, Set
import json
from datetime import datetime, timedelta
import os
from uuid import uuid4
from dotenv import load_dotenv
from pathlib import Path
import asyncio

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = (BASE_DIR / ".." / "FrontEnd" / "dist").resolve()
INDEX_FILE = FRONTEND_DIST / "index.html"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

clients: Dict[str, List[WebSocket]] = {}
usernames: Dict[str, Set[str]] = {}
last_active: Dict[str, datetime] = {}

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

class RoomCreate(BaseModel):
    username: str

@app.on_event("startup")
async def startup():
    app.state.db = await asyncpg.create_pool(
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        host=DB_HOST,
        port=DB_PORT
    )
    asyncio.create_task(cleanup_inactive_rooms())

@app.on_event("shutdown")
async def shutdown():
    await app.state.db.close()

@app.websocket("/ws/{room_id}/{username}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, username: str):
    await websocket.accept()
    if room_id not in clients:
        clients[room_id] = []
        usernames[room_id] = set()
    clients[room_id].append(websocket)
    usernames[room_id].add(username)
    last_active[room_id] = datetime.utcnow()
    await broadcast_user_list(room_id)

    try:
        while True:
            try:
                data = await websocket.receive_text()
                msg_data = json.loads(data)
            except WebSocketDisconnect:
                break
            except Exception:
                continue

            content = msg_data.get("content", "")
            msg_type = msg_data.get("type", "text")

            try:
                await app.state.db.execute(
                    "INSERT INTO messages (room_id, username, content, type, created_at) VALUES ($1, $2, $3, $4, $5)",
                    room_id, username, content, msg_type, datetime.utcnow()
                )
            except Exception:
                pass

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
                except:
                    disconnected.append(client)

            for dc in disconnected:
                clients[room_id].remove(dc)
            last_active[room_id] = datetime.utcnow()

    finally:
        if websocket in clients[room_id]:
            clients[room_id].remove(websocket)
        usernames[room_id].discard(username)
        await broadcast_user_list(room_id)
        if not clients[room_id]:
            del clients[room_id]
            del usernames[room_id]
            if room_id in last_active:
                del last_active[room_id]

async def broadcast_user_list(room_id: str):
    user_list_payload = json.dumps({
        "type": "user_list",
        "users": list(usernames[room_id]),
        "count": len(usernames[room_id])
    })
    for client in clients[room_id]:
        try:
            await client.send_text(user_list_payload)
        except:
            pass

async def cleanup_inactive_rooms():
    while True:
        now = datetime.utcnow()
        inactive = [rid for rid, ts in last_active.items() if now - ts > timedelta(hours=1)]
        for rid in inactive:
            try:
                await app.state.db.execute("UPDATE rooms SET is_active = false WHERE room_id = $1", rid)
                del clients[rid]
                del usernames[rid]
                del last_active[rid]
            except:
                pass
        await asyncio.sleep(600)

@app.post("/rooms")
async def create_room(room: RoomCreate):
    while True:
        room_id = uuid4().hex[:8]
        existing = await app.state.db.fetchrow("SELECT 1 FROM rooms WHERE room_id = $1", room_id)
        if not existing:
            break

    try:
        await app.state.db.execute(
            "INSERT INTO rooms (username, room_id, created_at, is_active) VALUES ($1, $2, $3, true)",
            room.username, room_id, datetime.utcnow()
        )
        return {"status": "success", "room_id": room_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rooms/{username}")
async def get_rooms(username: str):
    try:
        rows = await app.state.db.fetch(
            "SELECT room_id FROM rooms WHERE username = $1 AND is_active = true ORDER BY created_at ASC",
            username
        )
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/rooms/{room_id}")
async def delete_room(room_id: str):
    try:
        await app.state.db.execute("UPDATE rooms SET is_active = false WHERE room_id = $1", room_id)
        return {"status": "disabled"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register")
async def register_user(form: RegisterForm):
    try:
        await app.state.db.execute(
            "INSERT INTO users (name, username, password) VALUES ($1, $2, $3)",
            form.name, form.username, form.password
        )
        return {"status": "success", "message": "회원가입 성공!"}
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
async def login_user(form: LoginForm):
    user = await app.state.db.fetchrow("SELECT * FROM users WHERE username = $1", form.username)
    if not user:
        raise HTTPException(status_code=401, detail="아이디가 존재하지 않습니다.")
    if form.password != user["password"]:
        raise HTTPException(status_code=401, detail="비밀번호가 올바르지 않습니다.")
    return {
        "status": "success",
        "message": "로그인 성공!",
        "username": user["username"],
        "name": user["name"]
    }

@app.post("/messages")
async def save_message(msg: Message):
    try:
        await app.state.db.execute(
            "INSERT INTO messages (room_id, username, content, type, created_at) VALUES ($1, $2, $3, $4, $5)",
            msg.room_id, msg.username, msg.content, msg.type, msg.created_at or datetime.utcnow()
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@app.get("/check-username/{username}")
async def check_username(username: str):
    user = await app.state.db.fetchrow("SELECT * FROM users WHERE username = $1", username)
    if user:
        return {"status": "success", "message": f"{username} 존재함"}
    raise HTTPException(status_code=404, detail=f"{username} 존재하지 않음")

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

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith(("api", "ws", "uploads", "register", "login", "messages", "upload", "check-username", "rooms")):
        raise HTTPException(status_code=404, detail="Not Found")
    if INDEX_FILE.exists():
        return FileResponse(INDEX_FILE)
    return {"detail": "Frontend not built"}
