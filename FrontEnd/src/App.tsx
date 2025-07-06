import { useEffect, useRef, useState } from "react";
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const username = prompt("사용자 이름을 입력하세요") || "guest";

type ChatMessage = {
  sender?: string;
  role?: string;
  content: string;
  system?: boolean;
  image?: boolean;
};

function App() {
  const [roomId] = useState("chatroom1");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/${roomId}/${username}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (typeof parsed.image === "string") {
        parsed.image = parsed.image.toLowerCase() === "true";
      }
      setChatLog((prev) => [...prev, parsed]);
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket Error:", err);
    };

    socket.onclose = () => {
      console.warn("⚠️ WebSocket closed");
    };

    return () => {
      socket.close();
    };
  }, [roomId]);

  useEffect(() => {
    chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
  }, [chatLog]);

  const sendMessage = async () => {
    if (!socketRef.current || (!message.trim() && !imageFile)) return;

    let content = message;
    let isImage = false;

    if (imageFile) {
      try {
        const fileName = `images/${Date.now()}_${imageFile.name}`;
        const storageRef = ref(storage, fileName);

        console.log("📤 업로드 시도 중:", fileName);

        const snapshot = await uploadBytes(storageRef, imageFile);
        console.log("✅ 업로드 성공:", snapshot);

        const downloadURL = await getDownloadURL(storageRef);
        console.log("🌐 다운로드 URL:", downloadURL);

        content = downloadURL;
        isImage = true;
      } catch (error: any) {
        console.error("❌ Firebase 업로드 실패:", error);
        alert("🔥 Firebase 업로드 실패: " + error.message);
        return;
      }
    }

    const messageObject = JSON.stringify({
      content,
      image: isImage,
    });

    socketRef.current.send(messageObject);

    setMessage("");
    setImageFile(null);
    const input = document.getElementById("imageInput") as HTMLInputElement;
    if (input) input.value = "";
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>🧑‍💬 채팅방: {roomId}</h2>

      <div
        ref={chatBoxRef}
        style={{
          border: "1px solid gray",
          height: "300px",
          overflowY: "scroll",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {chatLog.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.system
                ? "center"
                : msg.sender === username
                ? "flex-end"
                : "flex-start",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                backgroundColor: msg.system
                  ? "#ccc"
                  : msg.sender === username
                  ? "#d1e7dd"
                  : "#e2e3e5",
                padding: "6px 10px",
                borderRadius: "15px",
                maxWidth: "60%",
              }}
            >
              {!msg.system && (
                <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
                  {msg.sender}
                </div>
              )}
              <div>
                {msg.image ? (
                  <img
                    src={msg.content}
                    alt="uploaded"
                    style={{ maxWidth: "100%", borderRadius: "10px" }}
                    onError={() =>
                      console.warn("❌ 이미지를 불러올 수 없습니다. CORS 또는 잘못된 URL 가능성.")
                    }
                  />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <input
        type="text"
        value={message}
        placeholder="메시지 입력"
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") sendMessage();
        }}
        style={{ width: "300px", marginRight: "10px" }}
      />

      <input
        type="file"
        id="imageInput"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setImageFile(file);
        }}
        style={{ marginRight: "10px" }}
      />

      <button onClick={sendMessage}>전송</button>
    </div>
  );
}

export default App;
