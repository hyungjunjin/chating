import { useEffect, useState } from "react";

interface RoomInfo {
  room_id: string;
  username: string;
  created_at: string;
  is_active: boolean;
}

interface Message {
  sender: string;
  content: string;
  type: string;
  created_at: string;
}

const BACKEND_URL = "https://chating-yjax.onrender.com";

function Admin() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/admin/rooms`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRooms(data);
        } else {
          console.error("방 목록 형식이 올바르지 않음:", data);
        }
      })
      .catch((err) => {
        console.error("방 목록 불러오기 실패:", err);
      });
  }, []);

  const loadMessages = (roomId: string) => {
    setSelectedRoom(roomId);
    fetch(`${BACKEND_URL}/messages/${roomId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          console.warn("채팅 기록 형식 오류", data);
        }
      })
      .catch((err) => {
        console.error("메시지 로딩 실패:", err);
      });
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">📊 관리자 대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 왼쪽: 방 목록 */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">전체 채팅방 목록</h2>
          <ul className="space-y-3 max-h-[500px] overflow-y-auto">
            {rooms.map((room) => (
              <li
                key={room.room_id}
                className={`p-3 rounded border flex justify-between items-center ${
                  selectedRoom === room.room_id ? "bg-indigo-50 border-indigo-300" : "bg-white"
                }`}
              >
                <div>
                  <p className="font-semibold">방 ID: {room.room_id}</p>
                  <p className="text-sm text-gray-500">
                    생성자: {room.username} | {new Date(room.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm mt-1">
                    상태:{" "}
                    <span className={room.is_active ? "text-green-600" : "text-red-500"}>
                      {room.is_active ? "활성" : "비활성"}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => loadMessages(room.room_id)}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  채팅 보기
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 오른쪽: 채팅 로그 */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">📨 채팅 로그</h2>
          {selectedRoom ? (
            messages.length > 0 ? (
              <ul className="space-y-3 max-h-[500px] overflow-y-auto">
                {messages.map((msg, idx) => (
                  <li key={idx} className="p-3 border rounded bg-gray-100">
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>{msg.sender}</strong> |{" "}
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                    {msg.type === "image" ? (
                      <img src={msg.content} alt="이미지" className="max-w-xs rounded" />
                    ) : msg.type === "video" ? (
                      <video src={msg.content} controls className="max-w-xs rounded" />
                    ) : msg.type === "file" ? (
                      <a href={msg.content} className="text-blue-600 underline" download>
                        파일 다운로드
                      </a>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">{msg.content}</pre>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">이 방에는 채팅이 없습니다.</p>
            )
          ) : (
            <p className="text-gray-500">오른쪽에서 채팅방을 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Admin;
