// src/RoomEntry.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"

function RoomEntry() {
  const [username, setUsername] = useState("")
  const navigate = useNavigate()

  const handleCreateRoom = () => {
    const roomId = uuidv4().slice(0, 8)  // 간단한 8자리 UUID
    navigate(`/login?room=${roomId}&username=${username}`);
  }

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h2>🛋️ 채팅방 입장</h2>
      <input
        placeholder="사용자 이름"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ padding: 10, marginBottom: 10 }}
      />
      <br />
      <button onClick={handleCreateRoom}>방 만들고 입장하기</button>
    </div>
  )
}

export default RoomEntry
