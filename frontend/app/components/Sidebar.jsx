"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { dancingScript } from "../fonts";

const navItems = [
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
  {
    label: "Notifications",
    href: "/app/notifications",
    icon: "/icons/notification - white.png",
    iconActive: "/icons/notification - white.png",
  },
  {
    label: "Profile",
    href: "/app/profile",
    icon: "/icons/user - white.png",
    iconActive: "/icons/user - white.png",
  },
];

export default function Sidebar({ onLogoClick }) {
  const pathname = usePathname();

  return (
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
      </nav>
    </aside>
  );
}
