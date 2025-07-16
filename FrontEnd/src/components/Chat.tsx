import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

interface Message {
  sender: string;
  content: string;
  type: "text" | "image" | "video" | "file";
  created_at: string;
}

const BACKEND_URL = "http://localhost:8000";

function Chat({ username }: { username: string }) {
  const { roomId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId || !username) return;

    const socket = new WebSocket(`ws://localhost:8000/ws/${roomId}/${username}`);
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
      className={`flex flex-col h-screen w-screen p-5 box-border transition-all ${
        isDragging ? "border-4 border-dashed border-gray-400 bg-gray-100" : ""
      }`}
    >
      <h2 className="text-xl font-semibold mb-2">💬 {username}님의 채팅방 [{roomId}]</h2>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden border border-gray-300 mb-3 p-3 rounded bg-white">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex mb-3 ${msg.sender === username ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative p-2 rounded-lg max-w-[80%] overflow-x-auto ${
                msg.sender === username ? "bg-green-100" : "bg-gray-100"
              }`}
            >
              {msg.type === "image" ? (
                <img src={msg.content} alt="이미지" className="max-w-full" />
              ) : msg.type === "video" ? (
                <video
                  src={msg.content}
                  controls
                  className="max-w-full rounded shadow-sm"
                />
              ) : msg.type === "file" ? (
                <a
                  href={msg.content}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  파일 다운로드
                </a>
              ) : (
                <div className="relative">
                  <pre className="m-0 font-mono text-left whitespace-pre overflow-x-auto">
                    {msg.content}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      setCopiedIndex(idx);
                      setTimeout(() => setCopiedIndex(null), 1500);
                    }}
                    className="absolute -top-2 -right-2 text-xs px-2 py-1 bg-gray-200 border border-gray-300 rounded shadow hover:bg-gray-100"
                  >
                    {copiedIndex === idx ? "✅ 복사됨" : "복사"}
                  </button>
                </div>
              )}
              <div className="text-xs text-gray-500 text-right mt-3">
                {new Date(msg.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="file"
          accept="*/*"
          onChange={handleFileUpload}
          className="flex-1"
        />
      </div>

      <div className="flex gap-2 items-end mt-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요"
          rows={3}
          className="flex-1 p-2 text-base font-mono resize-y box-border border border-gray-300 rounded"
        />
        <button
          onClick={handleSend}
          className="h-full px-4 py-2 text-base bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          보내기
        </button>
      </div>
    </div>
  );
}

export default Chat;
