"use client";
import { useEffect, useState} from "react";
import Link from "next/link"
import { dancingScript } from "../fonts";
import { ChevronDown } from "./chevron";

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
        "sticky top-0 z-50 w-full border-b transition-all duration-300 black_pointy",
        scrolled
        ? "border-transparent bg-[#141D29]"
        : "border-transparent bg-transparent",
      ].join(" ")}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <div className="text-2xl text-white">
            <Link href="/" className={`${dancingScript.className} pointy text-3xl font-semibold tracking-wide`}>
                Sigmas Hub
            </Link>
          </div>

          <nav className="hidden items-center gap-10 text-white/80 md:flex">
            <a className="pointy hover:text-white" href="#features">Features</a>
            <a className="pointy hover:text-white" href="#vision">Vision</a>
            <a className="pointy hover:text-white" href="#about">About</a>
          </nav>

          <div className="flex items-center gap-5 text-white/80">
          <button className="pointy group inline-flex items-center gap-1 rounded-md border-2 border-transparent px-4 py-2 text-white/80 transition-colors hover:text-white hover:border-orange-400">
            <span>Help</span>
            <ChevronDown className="h-4 w-4 text-current transition-transform duration-200 group-hover:rotate-180" />
          </button>




            <Link href="/login" className="pointy rounded-full border border-orange-300/70 px-4 py-2 text-orange-200 hover:bg-white/5">
              Login
            </Link>
          </div>
        </div>
    </header>
  );
}