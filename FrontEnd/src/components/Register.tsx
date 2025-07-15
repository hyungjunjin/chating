import { useState } from "react";

interface RegisterProps {
  onBack: () => void;
  baseUrl: string;
}

function Register({ onBack, baseUrl }: RegisterProps) {
  const [form, setForm] = useState({ name: "", username: "", password: "" });

  const handleRegister = async () => {
    try {
      const res = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        alert("회원가입 성공! 로그인 해주세요");
        onBack();
      } else {
        const data = await res.json();
        alert(data.detail || "회원가입 실패");
      }
    } catch (err) {
      alert("서버 요청 실패");
    }
  };

  return (
    <div>
      <h2>회원가입</h2>
      <input
        placeholder="이름"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        placeholder="아이디"
        value={form.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })}
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <button onClick={handleRegister}>가입하기</button>
      <button onClick={onBack}>← 로그인으로</button>
    </div>
  );
}

export default Register;
