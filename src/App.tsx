// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";
import Home from "./components/Home";

function AppWrapper() {
  const [username, setUsername] = useState<string | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Home username={username} setUsername={setUsername} />
          }
        />
        <Route
          path="/login"
          element={
            <Login
              onLogin={setUsername}
              onRegisterClick={() => {}}
            />
          }
        />
        <Route
          path="/chat/:roomId"
          element={
            username ? (
              <Chat username={username} />
            ) : (
              <NavigateToLogin />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

// 🔁 로그인 안되어 있을 경우, 로그인 페이지로 리다이렉트 + 현재 위치 기억
function NavigateToLogin() {
  const location = useLocation();
  return <Navigate to="/login" state={{ from: location.pathname }} replace />;
}

export default AppWrapper;
