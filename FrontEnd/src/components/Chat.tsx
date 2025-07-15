import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

interface Message {
  sender: string;
  content: string;
  type: "text" | "image" | "video" | "file";
  created_at: string;
}

// ✅ 배포 주소로 설정
const BACKEND_URL = "https://chating-yjax.onrender.com";

function Chat({ username }: { username: string }) {
  const { roomId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId || !username) return;

    const socket = new WebSocket(`wss://chating-yjax.onrender.com/ws/${roomId}/${username}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const content = data.content;
        const isVideo = /\.(mp4|mov|webm)$/i.test(content);
        const isImage = /\.(jpg|jpeg|png|gif)$/i.test(content);

        setMessages((prev) => [
          ...prev,
          {
            sender: data.sender,
            content,
            type: data.type || (isVideo ? "video" : isImage ? "image" : "text"),
            created_at: data.created_at || new Date().toISOString(),
          },
        ]);
      } catch (e) {
        console.error("메시지 파싱 에러:", e);
      }
    };

    fetch(`${BACKEND_URL}/messages/${roomId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const converted = data.map((msg) => {
            const content = msg.content;
            const isVideo = /\.(mp4|mov|webm)$/i.test(content);
            const isImage = /\.(jpg|jpeg|png|gif)$/i.test(content);
            return {
              sender: msg.username,
              content,
              type: msg.type || (isVideo ? "video" : isImage ? "image" : "text"),
              created_at: msg.created_at,
            };
          });
          setMessages(converted);
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

    const isImage = text.match(/\.(jpg|jpeg|png|gif)$/i);
    const isVideo = text.match(/\.(mp4|mov|webm)$/i);

    const payload = {
      sender: username,
      content: text,
      type: isVideo ? "video" : isImage ? "image" : "text",
    };

    socketRef.current.send(JSON.stringify(payload));
    setText("");
  };

  const uploadFile = async (file: File) => {
    if (!file || !socketRef.current) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      const url = data.url;

      const fileName = file.name.toLowerCase();
      const isVideo = /\.(mp4|mov|webm)$/i.test(fileName);
      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fileName);

      const payload = {
        sender: username,
        content: url,
        type: isVideo ? "video" : isImage ? "image" : "file",
      };

      socketRef.current.send(JSON.stringify(payload));
    } catch (err) {
      console.error("파일 업로드 실패:", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        padding: "20px",
        boxSizing: "border-box",
        border: isDragging ? "3px dashed #888" : undefined,
        backgroundColor: isDragging ? "#f7f7f7" : undefined,
        transition: "all 0.2s",
      }}
    >
      <h2>💬 {username}님의 채팅방 [{roomId}]</h2>

      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        border: "1px solid #ccc",
        marginBottom: "10px",
        padding: "10px"
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: "flex",
            justifyContent: msg.sender === username ? "flex-end" : "flex-start",
            marginBottom: "12px"
          }}>
            <div style={{
              background: msg.sender === username ? "#dcf8c6" : "#f1f0f0",
              padding: "8px",
              borderRadius: "10px",
              maxWidth: "80%",
              overflowX: "auto",
              position: "relative"
            }}>
              {msg.type === "image" ? (
                <img src={msg.content} alt="이미지" style={{ maxWidth: "100%" }} />
              ) : msg.type === "video" ? (
                <video src={msg.content} controls style={{
                  maxWidth: "100%",
                  borderRadius: "10px",
                  boxShadow: "0 0 4px rgba(0,0,0,0.2)"
                }} />
              ) : msg.type === "file" ? (
                <a href={msg.content} download target="_blank" rel="noopener noreferrer">
                  파일 다운로드
                </a>
              ) : (
                <div style={{ position: "relative" }}>
                  <pre style={{
                    margin: 0,
                    fontFamily: "monospace",
                    whiteSpace: "pre",
                    textAlign: "left",
                    overflowX: "auto"
                  }}>
                    {msg.content}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      setCopiedIndex(idx);
                      setTimeout(() => setCopiedIndex(null), 1500);
                    }}
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-8px",
                      zIndex: 1,
                      fontSize: "12px",
                      padding: "4px 8px",
                      cursor: "pointer",
                      background: "#eee",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                    }}
                  >
                    {copiedIndex === idx ? "✅ 복사됨" : "복사"}
                  </button>
                </div>
              )}
              <div style={{
                fontSize: "12px",
                color: "#aaa",
                textAlign: "right",
                marginTop: "12px"
              }}>
                {new Date(msg.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          type="file"
          accept="*/*"
          onChange={handleFileUpload}
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginTop: "10px" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요"
          rows={3}
          style={{
            flex: 1,
            padding: "10px",
            fontSize: "16px",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            resize: "vertical",
            boxSizing: "border-box"
          }}
        />
        <button
          onClick={handleSend}
          style={{
            height: "100%",
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer"
          }}
        >
          보내기
        </button>
      </div>
    </div>
  );
}

export default Chat;
