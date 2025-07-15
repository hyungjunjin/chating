import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Chat from "./components/Chat";
import Home from "./components/Home";
function AppWrapper() {
    const [username, setUsername] = useState(null);
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, { username: username, setUsername: setUsername }) }), _jsx(Route, { path: "/chat/:roomId", element: username ? (_jsx(Chat, { username: username })) : (_jsx(NavigateToHome, {})) })] }) }));
}
// 로그인되지 않은 상태에서 채팅방에 접근하면 홈으로 보내고, 원래 경로 기억
function NavigateToHome() {
    const location = useLocation();
    return _jsx(Navigate, { to: "/", state: { from: location.pathname }, replace: true });
}
export default AppWrapper;
