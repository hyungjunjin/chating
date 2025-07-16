// src/components/Home.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import Login from "./Login";
import Register from "./Register";

// ✅ 백엔드 주소 설정 (Render 주소 사용)
const BACKEND_URL = "http://localhost:8000";

function Home({
  username,
  setUsername,
}: {
  username: string | null;
  setUsername: (u: string) => void;
}) {
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleRoomCreate = () => {
    if (!username) {
      alert("먼저 로그인 해주세요!");
      return;
    }

    const roomId = uuidv4().slice(0, 8);
    navigate(`/chat/${roomId}`);
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>🔥 채팅 앱</h1>

      {username ? (
        <>
          <p style={{ marginBottom: "20px", fontSize: "18px" }}>
            ✅ <strong>{username}</strong> 님, 로그인 완료!
          </p>
          <button
            onClick={handleRoomCreate}
            style={{ padding: "12px 24px", fontSize: "16px" }}
          >
            🎯 채팅방 생성 및 입장
          </button>
        </>
      ) : isRegistering ? (
        <Register
          onBack={() => setIsRegistering(false)}
          baseUrl={BACKEND_URL}
        />
      ) : (
        <Login
          onLogin={(username) => setUsername(username)}
          onRegisterClick={() => setIsRegistering(true)}
          baseUrl={BACKEND_URL}
        />
      )}
    </div>
  );
}

export default Home;
