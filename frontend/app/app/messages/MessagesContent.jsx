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
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isGroup = selected.length > 1;

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

  const toggleUser = (user) => {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (selected.length === 0) return;
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
        body: JSON.stringify({
          member_ids: [userId, ...selected.map((u) => u.id)],
          is_group: isGroup,
          name: isGroup ? groupName.trim() || null : null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onChatCreated(data.chat_id);
        onClose();
      } else {
        setError(data.detail || "Failed to create chat.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">New Chat</h2>
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
                onClick={() => toggleUser(user)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                  selected.find((u) => u.id === user.id)
                    ? "bg-white/15"
                    : "hover:bg-white/5"
                }`}
              >
                <Avatar
                  src={user.profile_image_url}
                  username={user.username}
                  size={32}
                />
                <span className="text-white text-sm">{user.username}</span>
                {selected.find((u) => u.id === user.id) && (
                  <span className="ml-auto text-green-400 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selected.map((u) => (
              <span
                key={u.id}
                className="bg-white/10 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1"
              >
                {u.username}
                <button
                  onClick={() => toggleUser(u)}
                  className="text-white/50 hover:text-white ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {isGroup && (
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-white/30 text-sm mb-3"
          />
        )}

        {error && (
          <p className="text-red-400 text-xs mb-3 text-center">{error}</p>
        )}
        <button
          onClick={handleCreate}
          disabled={selected.length === 0 || loading}
          className="w-full bg-white text-black font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-white/90 transition text-sm"
        >
          {loading ? "Creating..." : isGroup ? "Create Group" : "Start Chat"}
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
      <Avatar
        src={chat.display_image}
        username={chat.display_name}
        size={44}
      />
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
            <>
              {chat.is_group && chat.last_sender_username
                ? `${chat.last_sender_username}: `
                : ""}
              {chat.last_message}
            </>
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
    <div
      className={`flex items-end gap-2 mb-2 ${
        isOwn ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {!isOwn && (
        <Avatar
          src={msg.sender_image}
          username={msg.sender_username}
          size={28}
        />
      )}
      <div
        className={`max-w-[70%] flex flex-col ${
          isOwn ? "items-end" : "items-start"
        }`}
      >
        {!isOwn && (
          <span className="text-white/40 text-[11px] mb-1 ml-1">
            {msg.sender_username}
          </span>
        )}
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
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [addUserQuery, setAddUserQuery] = useState("");
  const [addUserResults, setAddUserResults] = useState([]);

  const messagesEndRef = useRef(null);
  const lastMsgIdRef = useRef(0);
  const activeChatIdRef = useRef(null);

  const getHeaders = useCallback(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chats`, {
        headers: getHeaders(),
      });
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
      setShowMembers(false);
      setAddUserQuery("");
      setAddUserResults([]);
      try {
        const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        if (data.ok) {
          setActiveChat(data.chat);
          setMembers(data.members);
          setMessages(data.messages);
          lastMsgIdRef.current =
            data.messages.length > 0
              ? data.messages[data.messages.length - 1].id
              : 0;
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

  // Poll for new messages in the active chat
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
          lastMsgIdRef.current =
            data.messages[data.messages.length - 1].id;
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

  // Scroll to bottom on new messages
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
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
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

  const leaveChat = async () => {
    if (!activeChatId) return;
    try {
      const res = await fetch(`${API_URL}/api/chats/${activeChatId}/leave`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.ok) {
        setActiveChatId(null);
        activeChatIdRef.current = null;
        setActiveChat(null);
        setMessages([]);
        setMembers([]);
        fetchChats();
      }
    } catch {}
  };

  const addMember = async (targetUserId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/chats/${activeChatId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getHeaders() },
          body: JSON.stringify({ user_id: targetUserId }),
        }
      );
      const data = await res.json();
      if (data.ok) {
        setAddUserQuery("");
        setAddUserResults([]);
        openChat(activeChatId);
      }
    } catch {}
  };

  // Search users for add-member
  useEffect(() => {
    if (!addUserQuery.trim()) {
      setAddUserResults([]);
      return;
    }
    const memberIds = members.map((m) => m.user_id);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/search?q=${encodeURIComponent(addUserQuery)}&user_id=${userId}`
        );
        const data = await res.json();
        if (data.ok)
          setAddUserResults(
            data.users.filter(
              (u) => u.id !== userId && !memberIds.includes(u.id)
            )
          );
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [addUserQuery, userId, members]);

  return (
    <div className="flex-1 flex overflow-hidden h-screen">
      {/* Left Panel */}
      <div className="w-[300px] border-r border-white/10 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-white font-semibold text-lg">Messages</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
            title="New Chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 5v14M5 12h14"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {chats.length === 0 ? (
            <p className="text-white/30 text-sm text-center mt-10 leading-relaxed">
              No chats yet.
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-white/30 text-sm">
              Select a chat to start messaging
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Avatar
                  src={activeChat.display_image}
                  username={activeChat.display_name}
                  size={38}
                />
                <div>
                  <p className="text-white font-semibold text-sm">
                    {activeChat.display_name}
                  </p>
                  <p className="text-white/40 text-xs">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeChat.is_group && (
                  <button
                    onClick={() => setShowMembers((p) => !p)}
                    className="text-white/60 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
                  >
                    Members
                  </button>
                )}
                <button
                  onClick={leaveChat}
                  className="text-red-400/70 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 transition"
                >
                  Leave
                </button>
              </div>
            </div>

            {/* Members Panel */}
            {showMembers && activeChat.is_group && (
              <div className="border-b border-white/10 px-6 py-3 bg-white/[0.02]">
                <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-2">
                  Members
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {members.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1"
                    >
                      <Avatar
                        src={m.profile_image_url}
                        username={m.username}
                        size={20}
                      />
                      <span className="text-white/80 text-xs">
                        {m.username}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <input
                    value={addUserQuery}
                    onChange={(e) => setAddUserQuery(e.target.value)}
                    placeholder="Add someone..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-white/20"
                  />
                  {addUserResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-xl z-10">
                      {addUserResults.slice(0, 5).map((u) => (
                        <button
                          key={u.id}
                          onClick={() => addMember(u.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 text-left"
                        >
                          <Avatar
                            src={u.profile_image_url}
                            username={u.username}
                            size={24}
                          />
                          <span className="text-white text-xs">
                            {u.username}
                          </span>
                          <span className="ml-auto text-white/40 text-xs">
                            Add
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 ? (
                <p className="text-white/30 text-sm text-center mt-8">
                  No messages yet. Say hi!
                </p>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.sender_id === userId}
                  />
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`w-4 h-4 ${
                      inputText.trim() ? "text-black" : "text-white/40"
                    }`}
                  >
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
