import { useState } from "react"

function Register({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({ name: "", username: "", password: "" })

  const handleRegister = async () => {
    const res = await fetch("http://localhost:8000/register", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })

    if (res.ok) {
      alert("회원가입 성공! 로그인 해주세요")
      onBack()
    } else {
      const data = await res.json()
      alert(data.detail)
    }
  }

  return (
    <div>
      <h2>회원가입</h2>
      <input placeholder="이름" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <input placeholder="아이디" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
      <input type="password" placeholder="비밀번호" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <button onClick={handleRegister}>가입하기</button>
      <button onClick={onBack}>← 로그인으로</button>
    </div>
  )
}

export default Register
