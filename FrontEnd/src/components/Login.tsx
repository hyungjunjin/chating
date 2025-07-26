import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface LoginProps {
  onLogin: (username: string, name: string) => void;
  onRegisterClick: () => void;
  baseUrl: string;
  setIsAdmin: (v: boolean) => void; // ✅ 추가
}

function Login({ onLogin, onRegisterClick, baseUrl, setIsAdmin }: LoginProps) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      alert("아이디와 비밀번호를 입력하세요");
      return;
    }

    try {
      const endpoint = isAdminLogin ? "/admin/login" : "/login";
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        if (isAdminLogin) {
          // ✅ 관리자 로그인 성공 처리
          localStorage.setItem("admin", "true");
          setIsAdmin(true); // ✅ 상태 업데이트로 App.tsx 리렌더링 유도
          alert("관리자 로그인 성공!");
          navigate("/admin");
        } else {
          // 일반 유저 로그인
          onLogin(data.username, data.name);
          navigate(from);
        }
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
        <h1 className="text-6xl font-bold text-center mb-2">Chating Web</h1>
        <h2 className="text-lg text-center mb-4">로그인</h2>

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

        <label className="flex items-center text-sm mb-3">
          <input
            type="checkbox"
            checked={isAdminLogin}
            onChange={(e) => setIsAdminLogin(e.target.checked)}
            className="mr-2"
          />
          관리자 로그인
        </label>

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
