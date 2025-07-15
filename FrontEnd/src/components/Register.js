import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
function Register({ onBack }) {
    const [form, setForm] = useState({ name: "", username: "", password: "" });
    const handleRegister = async () => {
        const res = await fetch("http://localhost:8000/register", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            alert("회원가입 성공! 로그인 해주세요");
            onBack();
        }
        else {
            const data = await res.json();
            alert(data.detail);
        }
    };
    return (_jsxs("div", { children: [_jsx("h2", { children: "\uD68C\uC6D0\uAC00\uC785" }), _jsx("input", { placeholder: "\uC774\uB984", value: form.name, onChange: e => setForm({ ...form, name: e.target.value }) }), _jsx("input", { placeholder: "\uC544\uC774\uB514", value: form.username, onChange: e => setForm({ ...form, username: e.target.value }) }), _jsx("input", { type: "password", placeholder: "\uBE44\uBC00\uBC88\uD638", value: form.password, onChange: e => setForm({ ...form, password: e.target.value }) }), _jsx("button", { onClick: handleRegister, children: "\uAC00\uC785\uD558\uAE30" }), _jsx("button", { onClick: onBack, children: "\u2190 \uB85C\uADF8\uC778\uC73C\uB85C" })] }));
}
export default Register;
