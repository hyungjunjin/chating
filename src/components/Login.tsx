// src/components/Login.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function Login({
  onLogin,
  onRegisterClick,
}: {
  onLogin: (username: string) => void;
  onRegisterClick: () => void;
}) {
  const [form, setForm] = useState({ username: "", password: "" });

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/"; // 원래 가려던 경로 또는 홈

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      alert("아이디와 비밀번호를 입력하세요");
      return;
    }

    const res = await fetch("http://localhost:8000/login", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      onLogin(form.username); // App 상태에 로그인 반영
      navigate(from);         // 원래 가려던 페이지로 이동
    } else {
      const data = await res.json();
      alert(data.detail); // 로그인 실패 메시지
    }
  };

  return (
    <div style={{ maxWidth: "300px", margin: "auto", padding: "1rem" }}>
      <h2>🔐 로그인</h2>
      <input
        type="text"
        placeholder="아이디"
        value={form.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })}
        style={{ marginBottom: "10px", width: "100%", padding: "8px" }}
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        style={{ marginBottom: "10px", width: "100%", padding: "8px" }}
      />
      <button onClick={handleLogin} style={{ width: "100%", padding: "10px" }}>
        로그인
      </button>
      <button
        onClick={onRegisterClick}
        style={{ width: "100%", padding: "10px", marginTop: "10px" }}
      >
        회원가입
      </button>
    </div>
  );
}

export default Login;
