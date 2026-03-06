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
  },
  {
    label: "Search",
    href: "/app/search",
    icon: "/icons/search_blank - white.png",
    iconActive: "/icons/search_filled - white.png",
  },
  {
    label: "Messages",
    href: "/app/messages",
    icon: "/icons/chat - white.png",
    iconActive: "/icons/chat - white.png",
  },
  {
    label: "Create",
    href: "/app/create",
    icon: "/icons/create_blank - white.png",
    iconActive: "/icons/create_filled - white.png",
  },
];

export default function Sidebar({ username, userId, onLogoClick }) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileHref = username ? `/app/${username}` : "/app/profile";
  const navItems = [
    ...linkNavItems,
    {
      label: "Profile",
      href: profileHref,
      icon: "/icons/user - white.png",
      iconActive: "/icons/user - white.png",
      exact: true,
    },
  ];

  // Fetch unread count on mount and periodically
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

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    setUnreadCount(0);
  };

  return (
    <>
      <aside className="w-[280px] h-screen sticky top-0 border-r border-white/10 bg-black">
        <div className="text-2xl text-white mb-5">
          <Link href="/app" className={`${dancingScript.className} pointy text-3xl font-semibold tracking-wide`}>
            Sigmas Hub
          </Link>
        </div>

        {/* Buttons */}
        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
              >
                <Image src={isActive ? item.iconActive : item.icon} alt="" width={26} height={26} />
                <span className={`text-lg ${isActive ? "font-semibold text-white" : "text-white/80"}`}>{item.label}</span>
              </Link>
            );
          })}

          {/* Notifications button */}
          <button
            onClick={handleOpenNotifications}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition hover:bg-white/5 cursor-pointer"
          >
            <div className="relative">
              <Image src="/icons/notification - white.png" alt="" width={26} height={26} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-lg text-white/80">Notifications</span>
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
