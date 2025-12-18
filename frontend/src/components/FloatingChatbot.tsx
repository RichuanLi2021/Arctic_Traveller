import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../services/chatbotAPI";
import "./styles/FloatingChatbot.css";

const FloatingChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [reply, setReply] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [reply, note, error]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message || loading) return;

    // 1. Immediately show user message
    setReply((prev) => [...prev, `You: ${message}`]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await sendChatMessage(message);
      // 2. Append assistant response
      setReply((prev) => [...prev, `🤖: ${res.reply}`]);
      setNote(res.note ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Chat request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`chat-fab ${open ? "chat-fab--open" : ""}`}>
      {!open ? (
        <button
          className="chat-fab__button"
          aria-label="Open Arctic Assistant"
          onClick={() => setOpen(true)}
        >
          💬
        </button>
      ) : (
        <div className="chat-fab__panel">
          <header className="chat-fab__header">
            <div>
              <h3>Arctic AI Assistant</h3>
              <p>Ask about ice coverage and predictions.</p>
            </div>
            <button
              className="chat-fab__close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          <div className="chat-body">
            <div className="chat-messages">
              {reply.length === 0 ? (
                <p className="chat-placeholder">
                  Hello! I can help you understand Arctic ice conditions and predictions. What would you like to know?
                </p>
              ) : (
                reply.map((line, idx) => (
                  <p key={idx} className={line.startsWith("You:") ? "chat-message chat-message--user" : "chat-message"}>
                    {line}
                  </p>
                ))
              )}

              {/* Typing Indicator */}
              {loading && (
                <div className="chat-message chat-message--loading">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              )}

              {note ? <p className="chat-note">{note}</p> : null}
              {error ? <p className="chat-error">{error}</p> : null}
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={input}
                placeholder="Ask about ice conditions…"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
              />
              <button type="button" onClick={handleSend} disabled={loading || !input.trim()}>
                ➜
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingChatbot;
