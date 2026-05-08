"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { API_URL } from "../../lib/config";
import { getAccessToken } from "../../lib/auth";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ src, username, size = 40 }) {
  const url = src ? `${API_URL}${src}` : null;
  if (url) {
    return (
      <img
        src={url}
        alt={username}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {username?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function NewChatModal({ userId, onClose, onChatCreated }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/search?q=${encodeURIComponent(query)}&user_id=${userId}`
        );
        const data = await res.json();
        if (data.ok) setResults(data.users.filter((u) => u.id !== userId));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [query, userId]);

  const handleCreate = async () => {
    if (!selected) return;
    setError("");
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ member_ids: [userId, selected.id] }),
      });
      const data = await res.json();
      if (data.ok) {
        onChatCreated(data.chat_id);
        onClose();
      } else {
        setError(data.detail || "Failed to create chat.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">New Message</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 mb-3 text-sm"
          autoFocus
        />

        {results.length > 0 && (
          <div className="max-h-44 overflow-y-auto mb-3 space-y-1">
            {results.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelected(user)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                  selected?.id === user.id ? "bg-white/15" : "hover:bg-white/5"
                }`}
              >
                <Avatar src={user.profile_image_url} username={user.username} size={32} />
                <span className="text-white text-sm">{user.username}</span>
                {selected?.id === user.id && (
                  <span className="ml-auto text-green-400 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={!selected || loading}
          className="w-full bg-white text-black font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-white/90 transition text-sm"
        >
          {loading ? "Opening..." : "Start Chat"}
        </button>
      </div>
    </div>
  );
}

function ChatItem({ chat, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${
        isActive ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <Avatar src={chat.display_image} username={chat.display_name} size={44} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-white font-medium text-sm truncate">
            {chat.display_name || "Chat"}
          </span>
          {chat.last_message_at && (
            <span className="text-white/40 text-[11px] shrink-0">
              {formatTime(chat.last_message_at)}
            </span>
          )}
        </div>
        <p className="text-white/40 text-xs truncate mt-0.5">
          {chat.last_message ? (
            chat.last_message
          ) : (
            <span className="italic">No messages yet</span>
          )}
        </p>
      </div>
    </button>
  );
}

function MessageBubble({ msg, isOwn }) {
  return (
    <div className={`flex items-end gap-2 mb-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {!isOwn && (
        <Avatar src={msg.sender_image} username={msg.sender_username} size={28} />
      )}
      <div className={`max-w-[70%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-2 rounded-2xl text-sm break-words ${
            isOwn
              ? "bg-white text-black rounded-br-sm"
              : "bg-white/10 text-white rounded-bl-sm"
          }`}
        >
          {msg.message_text}
        </div>
        <span className="text-white/25 text-[10px] mt-1 mx-1">
          {formatTime(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

export default function MessagesContent({ userId, username, initialChatId = null }) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [mobileView, setMobileView] = useState("list");

  const messagesEndRef = useRef(null);
  const lastMsgIdRef = useRef(0);
  const activeChatIdRef = useRef(null);

  const getHeaders = useCallback(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chats`, { headers: getHeaders() });
      const data = await res.json();
      if (data.ok) setChats(data.chats);
    } catch {}
  }, [getHeaders]);

  useEffect(() => {
    if (!userId) return;
    fetchChats();
    const interval = setInterval(fetchChats, 10000);
    return () => clearInterval(interval);
  }, [userId, fetchChats]);

  const openChat = useCallback(
    async (chatId) => {
      setActiveChatId(chatId);
      activeChatIdRef.current = chatId;
      setMobileView("chat");
      try {
        const res = await fetch(`${API_URL}/api/chats/${chatId}`, { headers: getHeaders() });
        const data = await res.json();
        if (data.ok) {
          setActiveChat(data.chat);
          setMessages(data.messages);
          lastMsgIdRef.current =
            data.messages.length > 0 ? data.messages[data.messages.length - 1].id : 0;
          fetch(`${API_URL}/api/chats/${chatId}/read`, {
            method: "POST",
            headers: getHeaders(),
          }).catch(() => {});
        }
      } catch {}
    },
    [getHeaders]
  );

  useEffect(() => {
    if (initialChatId) openChat(initialChatId);
  }, [initialChatId, openChat]);

  // Poll for new messages
  useEffect(() => {
    if (!activeChatId) return;
    const poll = async () => {
      if (activeChatIdRef.current !== activeChatId) return;
      try {
        const res = await fetch(
          `${API_URL}/api/chats/${activeChatId}/messages?after_id=${lastMsgIdRef.current}`,
          { headers: getHeaders() }
        );
        const data = await res.json();
        if (data.ok && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = data.messages.filter((m) => !existingIds.has(m.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
          lastMsgIdRef.current = data.messages[data.messages.length - 1].id;
          fetch(`${API_URL}/api/chats/${activeChatId}/read`, {
            method: "POST",
            headers: getHeaders(),
          }).catch(() => {});
        }
      } catch {}
    };
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [activeChatId, getHeaders]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !activeChatId) return;
    setInputText("");
    try {
      const res = await fetch(`${API_URL}/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.ok) {
        const optimistic = {
          id: data.message_id,
          sender_id: userId,
          sender_username: username ?? "You",
          sender_image: null,
          message_text: text,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);
        lastMsgIdRef.current = data.message_id;
        fetchChats();
      }
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden h-screen">
      {/* Left Panel */}
      <div className={`${mobileView === "chat" ? "hidden" : "flex"} md:flex w-full md:w-[300px] border-r border-white/10 flex-col shrink-0`}>
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-white font-semibold text-lg">Messages</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
            title="New Message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {chats.length === 0 ? (
            <p className="text-white/30 text-sm text-center mt-10 leading-relaxed">
              No messages yet.
              <br />
              Start a new conversation!
            </p>
          ) : (
            chats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={activeChatId === chat.id}
                onClick={() => openChat(chat.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden`}>
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setMobileView("list")}
                className="md:hidden text-white/60 hover:text-white mr-1"
                aria-label="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <Avatar src={activeChat.display_image} username={activeChat.display_name} size={38} />
              <p className="text-white font-semibold text-sm">{activeChat.display_name}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 ? (
                <p className="text-white/30 text-sm text-center mt-8">No messages yet. Say hi!</p>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === userId} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-white/10 shrink-0">
              <div className="flex items-end gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message..."
                  rows={1}
                  className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none focus:outline-none"
                  style={{ maxHeight: "120px" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim()}
                  className="w-8 h-8 bg-white disabled:bg-white/20 rounded-full flex items-center justify-center transition shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 ${inputText.trim() ? "text-black" : "text-white/40"}`}>
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>
              <p className="text-white/20 text-[10px] mt-1.5 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>

      {showNewChat && (
        <NewChatModal
          userId={userId}
          onClose={() => setShowNewChat(false)}
          onChatCreated={(chatId) => {
            fetchChats();
            openChat(chatId);
          }}
        />
      )}
    </div>
  );
}
