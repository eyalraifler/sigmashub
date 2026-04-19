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
        ? "border-transparent bg-black"
        : "border-transparent bg-transparent",
      ].join(" ")}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <div className="text-2xl text-white">
            <Link
              href="/"
              className={`${dancingScript.className} pointy text-3xl font-semibold tracking-wide`}
              onClick={(e) => {
                if (window.location.pathname === "/") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
                Sigmas Hub
            </Link>
          </div>

          <nav className="hidden items-center gap-10 text-white/80 md:flex">
            <a className="pointy hover:text-white" href="#features">Features</a>
            <a className="pointy hover:text-white" href="#vision">Vision</a>
            <a className="pointy hover:text-white" href="#about">About</a>
          </nav>

          <div className="flex items-center gap-5 text-white/80">
          <div className="relative group">
            <button className="pointy inline-flex items-center gap-1 border-2 border-transparent px-4 py-2 text-white/80 transition-colors group-hover:text-white group-hover:border-orange-400">
              <span>Help</span>
              <ChevronDown className="h-4 w-4 text-current transition-transform duration-200 group-hover:rotate-180" />
            </button>
            <div className="absolute left-0 top-full hidden group-hover:block">
              <div className="border-2 border-t-0 border-orange-400 bg-[#f5f0e8] whitespace-nowrap">
                <Link
                  href="/contact_page"
                  className="pointy block px-4 py-3 text-sm text-gray-800 hover:bg-orange-100 transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>




            <Link href="/login" className="pointy rounded-full border border-[#EE7951] px-4 py-2 text-[#EE7951] hover:bg-[#EE7951]/10">
              Login
            </Link>
          </div>
        </div>
    </header>
  );
}