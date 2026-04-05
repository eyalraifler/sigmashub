"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { dancingScript } from "../fonts";
import NotificationsPanel from "./NotificationsPanel";
import { API_URL } from "../lib/config";

const linkNavItems = [
  {
    label: "Home",
    href: "/app",
    icon: "/icons/home_blank - white.png",
    iconActive: "/icons/home_filled - white.png",
    exact: true,
    id: "home-link",
  },
  {
    label: "Search",
    href: "/app/search",
    icon: "/icons/search_blank - white.png",
    iconActive: "/icons/search_filled - white.png",
    id: "search-link",
  },
  {
    label: "Messages",
    href: "/app/messages",
    icon: "/icons/chat - white.png",
    iconActive: "/icons/chat - white.png",
    id: "messages-link",
  },
  {
    label: "Create",
    href: "/app/create",
    icon: "/icons/create_blank - white.png",
    iconActive: "/icons/create_filled - white.png",
    id: "create-link",
  },
];

export default function Sidebar({ username, userId, onLogoClick }) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const profileHref = username ? `/app/${username}` : "/app/profile";
  const navItems = [
    ...linkNavItems,
    {
      label: "Profile",
      href: profileHref,
      icon: "/icons/user - white.png",
      iconActive: "/icons/user - white.png",
      exact: true,
      id: "profile-link",
    },
  ];

  useEffect(() => {
    if (!userId) return;
    const fetchUnread = () => {
      fetch(`${API_URL}/api/notifications?user_id=${userId}`)
        .then((r) => r.json())
        .then((data) => { if (data.ok) setUnreadCount(data.unread_count); })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const fetchUnreadMessages = () => {
      const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/)?.[1];
      fetch(`${API_URL}/api/chats/unread-count`, {
        headers: token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {},
      })
        .then((r) => r.json())
        .then((data) => { if (data.ok) setUnreadMessages(data.count); })
        .catch(() => {});
    };
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    setUnreadCount(0);
  };

  return (
    <>
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="fixed top-0 left-0 h-screen border-r border-white/10 bg-black flex flex-col overflow-hidden z-40 transition-all duration-300 ease-in-out"
        style={{ width: expanded ? 240 : 68 }}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 shrink-0 overflow-hidden">
          <Link href="/app" className="shrink-0">
            <Image
              src="/icons/sigmashub_logo.png"
              alt="Sigmas Hub"
              width={36}
              height={36}
            />
          </Link>
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap"
            style={{ maxWidth: expanded ? 180 : 0, opacity: expanded ? 1 : 0 }}
          >
            <Link
              href="/app"
              className={`${dancingScript.className} text-2xl font-semibold tracking-wide text-white ml-3`}
            >
              Sigmas Hub
            </Link>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-2 flex-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                id={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                  isActive ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="relative shrink-0">
                  <Image
                    src={isActive ? item.iconActive : item.icon}
                    alt=""
                    width={26}
                    height={26}
                  />
                  {item.label === "Messages" && unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </div>
                <span
                  className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
                  style={{ maxWidth: expanded ? 160 : 0, opacity: expanded ? 1 : 0 }}
                >
                  <span className={`text-base ${isActive ? "font-semibold text-white" : "text-white/80"}`}>
                    {item.label}
                  </span>
                </span>
              </Link>
            );
          })}

          {/* Notifications */}
          <button
            onClick={handleOpenNotifications}
            id="notifications-link"
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-white/5 cursor-pointer"
          >
            <div className="relative shrink-0">
              <Image src="/icons/notification - white.png" alt="" width={26} height={26} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span
              className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
              style={{ maxWidth: expanded ? 160 : 0, opacity: expanded ? 1 : 0 }}
            >
              <span className="text-base text-white/80">Notifications</span>
            </span>
          </button>
        </nav>
      </aside>

      {showNotifications && (
        <NotificationsPanel
          userId={userId}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </>
  );
}
