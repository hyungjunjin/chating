// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Chat from "./components/Chat";
import Home from "./components/Home";

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
      </Routes>
    </BrowserRouter>
  );
}

function NavigateToHome() {
  const location = useLocation();
  return <Navigate to="/" state={{ from: location.pathname }} replace />;
}

export default AppWrapper;