import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

interface Message {
  sender: string;
  content: string;
  type: "text" | "image" | "video" | "file";
  created_at: string;
}

function Chat({ username }: { username: string }) {
  const { roomId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [enterToNewline, setEnterToNewline] = useState(false);
  const [showImage, setShowImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);

  const BACKEND_URL = "http://localhost:8000";

  useEffect(() => {
    if (!roomId || !username) return;
    const socket = new WebSocket(`${BACKEND_URL.replace("http", "ws")}/ws/${roomId}/${username}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "user_list") {
          setParticipants(data.users);
          return;
        }

        const content = data.content;
        const isVideo = /\.(mp4|mov|webm)$/i.test(content);
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(content);

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
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(content);
            return {
              sender: msg.username,
              content,
              type: msg.type || (isVideo ? "video" : isImage ? "image" : "text"),
              created_at: msg.created_at,
            };
          });
          setMessages(converted);
        } else {
          setMessages([]);
        }
      });

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [roomId, username]);

  const sendFile = async (selectedFile: File) => {
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`업로드 실패 (status: ${res.status})`);

      const data = await res.json();
      if (!data.url) throw new Error("서버 응답에 파일 URL이 없음");

      const url = `${BACKEND_URL}${data.url}`;
      const isVideo = /\.(mp4|mov|webm)$/i.test(selectedFile.name);
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedFile.name);

      socketRef.current?.send(
        JSON.stringify({
          sender: username,
          content: url,
          type: isVideo ? "video" : isImage ? "image" : "file",
        })
      );

      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("파일 전송 오류:", error);
      alert("파일 업로드에 실패했습니다. 콘솔을 확인해주세요.");
    }
  };

  const handleSend = async () => {
    if (!socketRef.current || !text.trim()) return;

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(text);
    const isVideo = /\.(mp4|mov|webm)$/i.test(text);

    socketRef.current.send(
      JSON.stringify({
        sender: username,
        content: text,
        type: isVideo ? "video" : isImage ? "image" : "text",
      })
    );
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !enterToNewline) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderTextMessage = (content: string, idx: number) => {
    const lineCount = content.split("\n").length;
    const shouldTruncate = lineCount > 10;
    const isExpanded = expandedIndex === idx;
    return (
      <div className="relative">
        <pre
          className={`m-0 font-mono text-sm whitespace-pre-wrap break-words overflow-x-auto text-left ${
            shouldTruncate && !isExpanded ? "line-clamp-3" : ""
          }`}
          style={{ maxHeight: shouldTruncate && !isExpanded ? "5.5em" : "none" }}
        >
          {content}
        </pre>
        {shouldTruncate && !isExpanded && (
          <button onClick={() => setExpandedIndex(idx)} className="mt-1 text-blue-600 text-xs underline">
            전체 보기
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 채팅 헤더 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) sendFile(dropped);
          setIsDragging(false);
        }}
        className={`relative flex flex-col h-screen w-screen p-5 box-border bg-gradient-to-br from-indigo-50 via-white to-pink-50 transition-all ${
          isDragging ? "border-4 border-dashed border-indigo-400" : ""
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-indigo-700">
            💬 <span className="font-semibold">{username}</span>님의 채팅방 [{roomId}]
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">👥 {participants.length}명</span>
            <button
              onClick={() => setShowParticipants(true)}
              className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            >
              참여자 목록
            </button>
          </div>
        </div>

        {/* 메시지 리스트 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden border border-indigo-100 mb-3 p-4 rounded-xl bg-white shadow-inner">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex mb-4 ${msg.sender === username ? "justify-end" : "justify-start"}`}>
              <div
                className={`relative p-3 rounded-2xl max-w-[600px] w-fit overflow-x-auto shadow-md transition break-words ${
                  msg.sender === username ? "bg-green-100 text-right" : "bg-gray-100 text-left"
                }`}
              >
                {msg.type === "image" ? (
                  <img
                    src={msg.content}
                    alt="이미지"
                    className="max-w-full rounded-md cursor-pointer"
                    onClick={() => setShowImage(msg.content)}
                  />
                ) : msg.type === "video" ? (
                  <video src={msg.content} controls className="max-w-full rounded-md" />
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
                  renderTextMessage(msg.content, idx)
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(msg.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 입력창 */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="file"
            ref={fileInputRef}
            accept="*/*"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) sendFile(selected);
            }}
            className="cursor-pointer file:cursor-pointer file:bg-indigo-600 file:text-white file:px-3 file:py-1 file:rounded file:border-0 text-sm"
          />
          <label className="flex items-center gap-1 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={enterToNewline}
              onChange={(e) => setEnterToNewline(e.target.checked)}
            />
            Enter로 줄바꿈
          </label>
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="메시지를 입력하세요"
            className="flex-1 p-3 text-base border border-gray-300 rounded-md shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={handleSend}
            className="h-full px-5 py-2 text-base font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            보내기
          </button>
        </div>
      </div>

      {/* 이미지 보기 모달 */}
      {showImage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="relative">
            <img src={showImage} alt="확대 이미지" className="max-w-full max-h-screen rounded shadow-lg" />
            <button
              onClick={() => setShowImage(null)}
              className="absolute top-2 right-2 px-3 py-1 bg-white text-black rounded shadow"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 전체 메시지 보기 모달 */}
      {expandedIndex !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full shadow-lg">
            <h3 className="text-lg font-semibold mb-4">전체 메시지</h3>
            <pre className="text-sm whitespace-pre max-h-[70vh] overflow-y-auto overflow-x-auto">
              {messages[expandedIndex].content}
            </pre>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => navigator.clipboard.writeText(messages[expandedIndex].content)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 mr-2"
              >
                복사
              </button>
              <button
                onClick={() => setExpandedIndex(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 참여자 목록 모달 */}
      {showParticipants && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-semibold mb-4">참여자 목록</h3>
            <ul className="max-h-[300px] overflow-y-auto text-sm list-disc pl-5">
              {participants.map((user, i) => (
                <li key={i}>{user}</li>
              ))}
            </ul>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowParticipants(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Chat;
