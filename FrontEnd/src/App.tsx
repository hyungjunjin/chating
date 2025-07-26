// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Chat from "./components/Chat";
import Home from "./components/Home";
import Admin from "./components/Admin";

function AppWrapper() {
  const [username, setUsername] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("admin") === "true"); // ✅ 상태 추가

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Home
              username={username}
              setUsername={setUsername}
              setName={setName}
              setIsAdmin={setIsAdmin} // ✅ 전달
            />
          }
        />
        <Route
          path="/chat/:roomId"
          element={
            username && name ? (
              <Chat username={username} name={name} />
            ) : (
              <NavigateToHome />
            )
          }
        />
        <Route
          path="/admin"
          element={
            isAdmin ? <Admin /> : <NavigateToHome /> // ✅ 상태 기반 분기
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function NavigateToHome() {
  const location = useLocation();
  return <Navigate to="/" state={{ from: location.pathname }} replace />;
}

export default AppWrapper;
