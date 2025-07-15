// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Chat from "./components/Chat";
import Home from "./components/Home";

function AppWrapper() {
  const [username, setUsername] = useState<string | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home username={username} setUsername={setUsername} />}
        />
        <Route
          path="/chat/:roomId"
          element={
            username ? (
              <Chat username={username} />
            ) : (
              <NavigateToHome />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

// 로그인되지 않은 상태에서 채팅방에 접근하면 홈으로 보내고, 원래 경로 기억
function NavigateToHome() {
  const location = useLocation();
  return <Navigate to="/" state={{ from: location.pathname }} replace />;
}

export default AppWrapper;
