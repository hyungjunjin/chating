// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Chat from "./components/Chat";
import Home from "./components/Home";
import Admin from "./components/Admin"; // ✅ 관리자 페이지 import

function AppWrapper() {
  const [username, setUsername] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home username={username} setUsername={setUsername} setName={setName} />}
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
            localStorage.getItem("admin") === "true" ? (
              <Admin />
            ) : (
              <NavigateToHome />
            )
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
