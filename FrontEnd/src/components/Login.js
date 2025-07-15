import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
function Login({ onLogin, onRegisterClick, baseUrl }) {
    const [form, setForm] = useState({ username: "", password: "" });
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || "/"; // 원래 가려던 경로 또는 홈
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
            }
            else {
                alert(data.detail || "로그인 실패");
            }
        }
        catch (e) {
            alert("서버 연결 실패");
        }
    };
    return (_jsxs("div", { style: { maxWidth: "300px", margin: "auto", padding: "1rem" }, children: [_jsx("h2", { children: "\uD83D\uDD10 \uB85C\uADF8\uC778" }), _jsx("input", { type: "text", placeholder: "\uC544\uC774\uB514", value: form.username, onChange: (e) => setForm({ ...form, username: e.target.value }), style: { marginBottom: "10px", width: "100%", padding: "8px" } }), _jsx("input", { type: "password", placeholder: "\uBE44\uBC00\uBC88\uD638", value: form.password, onChange: (e) => setForm({ ...form, password: e.target.value }), style: { marginBottom: "10px", width: "100%", padding: "8px" } }), _jsx("button", { onClick: handleLogin, style: { width: "100%", padding: "10px" }, children: "\uB85C\uADF8\uC778" }), _jsx("button", { onClick: onRegisterClick, style: { width: "100%", padding: "10px", marginTop: "10px" }, children: "\uD68C\uC6D0\uAC00\uC785" })] }));
}
export default Login;
