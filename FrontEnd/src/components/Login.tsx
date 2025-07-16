import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface LoginProps {
  onLogin: (username: string) => void;
  onRegisterClick: () => void;
  baseUrl: string;
}

function Login({ onLogin, onRegisterClick, baseUrl }: LoginProps) {
  const [form, setForm] = useState({ username: "", password: "" });

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      alert("아이디와 비밀번호를 입력하세요");
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        onLogin(form.username);
        navigate(from);
      } else {
        alert(data.detail || "로그인 실패");
      }
    } catch (e) {
      alert("서버 연결 실패");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-center mb-2">🔥 채팅 앱</h1>
        <h2 className="text-lg text-center mb-6">🔐 로그인</h2>

        <input
          type="text"
          placeholder="아이디"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full p-2 mb-3 border border-gray-300 rounded"
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full p-2 mb-3 border border-gray-300 rounded"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          로그인
        </button>

        <button
          onClick={onRegisterClick}
          className="w-full mt-3 py-2 border border-gray-400 rounded hover:bg-gray-100 transition"
        >
          회원가입
        </button>
      </div>
    </div>
  );
}

export default Login;
