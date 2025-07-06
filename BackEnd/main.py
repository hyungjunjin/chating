from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import urllib.parse  # ✅ 한글 인코딩 대응을 위한 추가

app = FastAPI()

# CORS 설정 (모든 origin 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 채팅방 별 클라이언트 목록
clients: dict[str, list[WebSocket]] = {}

@app.websocket("/ws/{room_id}/{username}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, username: str):
    await websocket.accept()

    # ✅ 한글 닉네임을 디코딩
    username = urllib.parse.unquote(username)

    if room_id not in clients:
        clients[room_id] = []

    # 역할 부여
    if len(clients[room_id]) == 0:
        role = "host"
    elif len(clients[room_id]) == 1:
        role = "guest"
    else:
        await websocket.send_text(json.dumps({
            "system": True,
            "content": "❌ 이 채팅방은 이미 가득 찼습니다."
        }))
        await websocket.close()
        return

    clients[room_id].append(websocket)

    await websocket.send_text(json.dumps({
        "system": True,
        "content": f"[시스템] 당신은 '{role}'입니다."
    }))

    try:
        while True:
            raw_data = await websocket.receive_text()

            try:
                parsed_data = json.loads(raw_data)
                content = parsed_data.get("content", "")
                is_image = parsed_data.get("image", False)

                if isinstance(is_image, str):
                    is_image = is_image.lower() == "true"

            except json.JSONDecodeError:
                content = raw_data
                is_image = False

            message = {
                "sender": username,
                "role": role,
                "content": content,
                "image": is_image
            }

            for client in clients[room_id]:
                await client.send_text(json.dumps(message))

    except WebSocketDisconnect:
        clients[room_id].remove(websocket)
