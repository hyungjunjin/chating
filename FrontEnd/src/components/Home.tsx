import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import Login from "./Login";
import Register from "./Register";

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
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-10 bg-gray-50 text-center">
      <h1 className="text-4xl font-bold mb-8">🔥 채팅 앱</h1>

      {username ? (
        <>
          <p className="mb-6 text-lg">
            ✅ <strong>{username}</strong> 님, 로그인 완료!
          </p>
          <button
            onClick={handleRoomCreate}
            className="px-6 py-3 text-white text-base rounded bg-green-600 hover:bg-green-700 transition"
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
