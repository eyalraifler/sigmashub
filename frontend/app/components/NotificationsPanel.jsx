"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "../lib/config";
import { getAccessToken } from "../lib/auth";

function timeAgo(isoString) {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPanel({ userId, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const panelRef = useRef(null);
  const router = useRouter();

  const handleNotificationClick = (n) => {
    if (n.notification_type === "message") {
      router.push(`/app/messages?chat=${n.chat_id}`);
    } else {
      router.push(`/app/${n.actor_username}?post=${n.post_id}`);
    }
    onClose();
  };

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    fetch(`${API_URL}/api/notifications?user_id=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setNotifications(data.notifications);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));

    const token = getAccessToken();
    fetch(`${API_URL}/api/notifications/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ user_id: userId }),
    }).catch(console.error);
  }, [userId]);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" />
      <div
        ref={panelRef}
        className="fixed top-0 left-0 z-50 h-screen w-[360px] bg-[#111] border-r border-white/10 flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white text-lg font-bold">Notifications</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-white/40 text-sm text-center py-10">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-10">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`flex items-center gap-3 px-5 py-3 border-b border-white/5 cursor-pointer hover:bg-white/10 transition ${
                  !n.is_read ? "bg-white/5" : ""
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {n.actor_profile_image_url ? (
                    <img
                      src={`${API_URL}${n.actor_profile_image_url}`}
                      alt={n.actor_username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {n.actor_username[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">
                    <span className="font-semibold">{n.actor_username}</span>{" "}
                    {n.notification_type === "message"
                      ? "sent you a message"
                      : "posted a new photo"}
                  </p>
                  <p className="text-white/40 text-xs">{timeAgo(n.created_at)}</p>
                </div>

                {/* Post thumbnail (post notifications only) */}
                {n.notification_type !== "message" && n.post_media_url && (
                  <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded">
                    <img
                      src={`${API_URL}${n.post_media_url}`}
                      alt="post"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Message icon (message notifications) */}
                {n.notification_type === "message" && (
                  <div className="w-10 h-10 flex-shrink-0 rounded bg-white/5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                )}

                {/* Unread dot */}
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
