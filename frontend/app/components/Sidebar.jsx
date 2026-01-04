"use client";

import Link from "next/link";
import Image from "next/image";
import { dancingScript } from "../fonts";

const navItems = [
  { label: "Home", href: "/app", icon: "/icons/home_filled - white.png" },
  { label: "Search", href: "/app/search", icon: "/icons/search_filled - white.png" },
  { label: "Messages", href: "/app/messages", icon: "/icons/chat - white.png" },
  { label: "Create", href: "/app/create", icon: "/icons/create_blank - white.png" },
  { label: "Notifications", href: "/app/notifications", icon: "/icons/notification - white.png" },
  { label: "Profile", href: "/app/profile", icon: "/icons/user - white.png" },
  //{ label: "More", href: "/sigmashub/more", icon: "/icons/more.png" },
];

export default function Sidebar({ onLogoClick }) {
  return (
    <aside className="w-[280px] h-screen sticky top-0 border-r border-white/10 bg-[#141D29]">
      <div className="text-2xl text-white mb-5">
        <Link href="/app" className={`${dancingScript.className} pointy text-3xl font-semibold tracking-wide`}>
          Sigmas Hub
        </Link>
      </div>

      {/* Buttons */}
      <nav className="px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition"
          >
            <Image src={item.icon} alt="" width={26} height={26} />
            <span className="text-lg">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}