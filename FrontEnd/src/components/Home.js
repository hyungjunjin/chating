import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/Home.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import Login from "./Login";
import Register from "./Register";
// ✅ 백엔드 주소 설정 (Render 주소 사용)
const BACKEND_URL = "https://chating-yjax.onrender.com";
function Home({ username, setUsername, }) {
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
    return (_jsxs("div", { style: { padding: "40px", textAlign: "center" }, children: [_jsx("h1", { children: "\uD83D\uDD25 \uCC44\uD305 \uC571" }), username ? (_jsxs(_Fragment, { children: [_jsxs("p", { style: { marginBottom: "20px", fontSize: "18px" }, children: ["\u2705 ", _jsx("strong", { children: username }), " \uB2D8, \uB85C\uADF8\uC778 \uC644\uB8CC!"] }), _jsx("button", { onClick: handleRoomCreate, style: { padding: "12px 24px", fontSize: "16px" }, children: "\uD83C\uDFAF \uCC44\uD305\uBC29 \uC0DD\uC131 \uBC0F \uC785\uC7A5" })] })) : isRegistering ? (_jsx(Register, { onBack: () => setIsRegistering(false), baseUrl: BACKEND_URL })) : (_jsx(Login, { onLogin: (username) => setUsername(username), onRegisterClick: () => setIsRegistering(true), baseUrl: BACKEND_URL }))] }));
}
export default Home;
