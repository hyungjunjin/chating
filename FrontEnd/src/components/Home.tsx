// src/components/Home.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";

const BACKEND_URL = "https://chating-yjax.onrender.com";

interface HomeProps {
  username: string | null;
  setUsername: (u: string) => void;
  setName: (n: string) => void;
}

function Home({ username, setUsername, setName }: HomeProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [rooms, setRooms] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      if (!username || typeof username !== "string" || username.trim() === "") return;

      try {
        const res = await fetch(`${BACKEND_URL}/rooms/${username}`);
        if (!res.ok) {
          let message = "서버 오류";
          try {
            const err = await res.json();
            message = err.detail || message;
          } catch {
            const text = await res.text();
            message = `응답이 JSON이 아님: ${text}`;
          }
          console.error("❌ 방 목록 불러오기 실패:", message);
          return;
        }

        const data = await res.json();
        console.log("✅ 받은 방 데이터:", data);
        if (Array.isArray(data)) {
          setRooms(data.map((r) => r.room_id));
        } else {
          console.warn("⚠️ 예상치 못한 응답 형식:", data);
        }
      } catch (e) {
        console.error("🚨 방 목록 요청 중 에러:", e);
      }
    };

    fetchRooms();
  }, [username]);

  const handleRoomCreate = async () => {
    if (!username) {
      alert("먼저 로그인 해주세요!");
      return;
    }

    if (rooms.length >= 3) {
      alert("채팅방은 최대 3개까지만 생성할 수 있습니다.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }), // ✅ room_id는 백엔드에서 생성
      });

      if (res.ok) {
        const data = await res.json();
        const newRoomId = data.room_id;
        setRooms((prev) => [...prev, newRoomId]);
        navigate(`/chat/${newRoomId}`);
      } else {
        const err = await res.json();
        alert(err.detail || "방 생성 실패");
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  const handleRoomDelete = async (roomId: string) => {
    await fetch(`${BACKEND_URL}/rooms/${roomId}`, { method: "DELETE" });
    setRooms((prev) => prev.filter((r) => r !== roomId));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-10 bg-gray-50 text-center">
      {username ? (
        <>
          <p className="mb-6 text-2xl">
            <strong>{username}</strong>님, 로그인 되었습니다.
          </p>

          <button
            onClick={handleRoomCreate}
            className={`w-72 py-5 text-2xl font-semibold text-white rounded transition ${
              rooms.length >= 3
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={rooms.length >= 3}
          >
            채팅방 생성 및 입장
          </button>

          {rooms.length > 0 && (
            <div className="mt-6 space-y-3 w-80">
              {rooms.map((roomId) => (
                <div
                  key={roomId}
                  className="flex justify-between items-center bg-white px-4 py-3 rounded shadow border"
                >
                  <button
                    onClick={() => navigate(`/chat/${roomId}`)}
                    className="text-blue-600 hover:underline"
                  >
                    {roomId} 입장
                  </button>
                  <button
                    onClick={() => handleRoomDelete(roomId)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : isRegistering ? (
        <Register   
          onBack={() => setIsRegistering(false)}
          baseUrl={BACKEND_URL}
        />
      ) : (
        <Login
          onLogin={(username, name) => {
            setUsername(username);
            setName(name);
          }}
          onRegisterClick={() => setIsRegistering(true)}
          baseUrl={BACKEND_URL}
        />
      )}
    </div>
  );
}

export default Home;
