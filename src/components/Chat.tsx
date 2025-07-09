import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

interface Message {
  sender: string;
  content: string;
  type: "text" | "image" | "video";
  created_at: string;
}

function Chat({ username }: { username: string }) {
  const { roomId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId || !username) return;

    const socket = new WebSocket(`ws://localhost:8000/ws/${roomId}/${username}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [
          ...prev,
          {
            sender: data.sender,
            content: data.content,
            type: data.type,
            created_at: data.created_at || new Date().toISOString(),
          },
        ]);
      } catch (e) {
        console.error("메시지 파싱 에러:", e);
      }
    };

    fetch(`http://localhost:8000/messages/${roomId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const converted = data.map((msg) => ({
            sender: msg.username,
            content: msg.content,
            type: msg.is_image
              ? msg.content.match(/\.(mp4|mov|webm)$/i)
                ? "video"
                : "image"
              : "text",
            created_at: msg.created_at,
          }));
          setMessages(converted as Message[]);
        } else {
          console.error("서버 응답이 배열이 아님:", data);
          setMessages([]);
        }
      })
      .catch((err) => {
        console.error("메시지 불러오기 실패:", err);
        setMessages([]);
      });

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [roomId, username]);

  const handleSend = () => {
    if (!text.trim() || !socketRef.current) return;

    const payload = {
      sender: username,
      content: text,
      type: text.startsWith("http") && text.match(/\.(jpg|jpeg|png|gif)$/i)
        ? "image"
        : text.match(/\.(mp4|mov|webm)$/i)
        ? "video"
        : "text",
    };

    socketRef.current.send(JSON.stringify(payload));
    setText("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socketRef.current) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      const url = data.url;

      const payload = {
        sender: username,
        content: url,
        type: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "text",
      };

      socketRef.current.send(JSON.stringify(payload));
    } catch (err) {
      console.error("파일 업로드 실패:", err);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: 20 }}>
      <h2>💬 {username}님의 채팅방 [{roomId}]</h2>
      <div
        style={{
          height: "400px",
          overflowY: "auto",
          border: "1px solid #ccc",
          marginBottom: "10px",
          padding: "10px",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.sender === username ? "right" : "left",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                background: msg.sender === username ? "#dcf8c6" : "#f1f0f0",
                padding: "8px",
                borderRadius: "10px",
                display: "inline-block",
                maxWidth: "80%",
              }}
            >
              {msg.type === "image" ? (
                <img
                  src={msg.content}
                  alt="전송된 이미지"
                  style={{ maxWidth: "100%" }}
                />
              ) : msg.type === "video" ? (
                <video src={msg.content} controls style={{ maxWidth: "100%" }} />
              ) : (
                msg.content
              )}
            </span>
            <div
              style={{
                fontSize: "12px",
                color: "#aaa",
                textAlign: "right",
              }}
            >
              {new Date(msg.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요"
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={handleSend}>보내기</button>
      </div>
    </div>
  );
}

export default Chat;
