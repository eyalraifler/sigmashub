"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });

  const [isPointer, setIsPointer] = useState(false);

  useEffect(() => {
    function onMove(e) {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    }

    function onOver(e) {
      const el = e.target;
      const wantsPointer =
        el?.closest?.("a,button,[data-cursor='pointer']") != null;
      setIsPointer(wantsPointer);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);

    let rafId = 0;
    function tick() {
      // smooth follow (lerp)
      pos.current.x += (mouse.current.x - pos.current.x) * 0.18;
      pos.current.y += (mouse.current.y - pos.current.y) * 0.18;

      const x = pos.current.x;
      const y = pos.current.y;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] hidden md:block">
      {/* dot */}
      <div
        ref={dotRef}
        className={[
          "absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2",
          "h-2 w-2 rounded-full bg-white",
          isPointer ? "opacity-100" : "opacity-70",
        ].join(" ")}
      />

      {/* ring */}
      <div
        ref={ringRef}
        className={[
          "absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2",
          "h-10 w-10 rounded-full border border-white/40",
          "transition-[transform,width,height,border-color] duration-150",
          isPointer ? "h-14 w-14 border-white/70" : "",
        ].join(" ")}
      />
    </div>
  );
}
