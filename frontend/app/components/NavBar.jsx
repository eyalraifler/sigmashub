"use client";
import { useEffect, useState} from "react";
import Link from "next/link"
import { dancingScript } from "../fonts";

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    
    onScroll();
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full border-b transition-all duration-300",
        scrolled
        ? "bg-[#141D29] backdrop-blur" //here
        : "border-transparent bg-transparent",
      ].join(" ")}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <div className="text-2xl text-white">
            <Link href="/" className={`${dancingScript.className} text-3xl font-semibold tracking-wide`}>
                Sigmas Hub
            </Link>
          </div>

          <nav className="hidden items-center gap-10 text-white/80 md:flex">
            <a className="hover:text-white" href="#features">Features</a>
            <a className="hover:text-white" href="#vision">Vision</a>
            <a className="hover:text-white" href="#about">About</a>
          </nav>

          <div className="flex items-center gap-5 text-white/80">
            <button className="hover:text-white">Help</button>
            <Link href="/login" className="rounded-full border border-orange-300/70 px-4 py-2 text-orange-200 hover:bg-white/5">
              Login
            </Link>
          </div>
        </div>
    </header>
  );
}