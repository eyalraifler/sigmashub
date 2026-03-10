"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

const HoverText = ({ text, className, delay = 0 }) => {
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const colors = ["#0AE448", "#FFFF55", "#FDAA48", "#FF7575"];

  useEffect(() => {
    if (!containerRef.current) return;

    const charsInner = containerRef.current.querySelectorAll(".char-inner");
    const wrappers = containerRef.current.querySelectorAll(".char-wrapper");

    // 1. Precise Spacing Fix: Measure each letter's natural width, minus tightening
    const fontSize = parseFloat(getComputedStyle(containerRef.current).fontSize);
    const tightening = fontSize * 0.04; // pull letters ~0.04em closer
    wrappers.forEach((wrapper, i) => {
      const naturalWidth = charsInner[i].offsetWidth;
      wrapper.style.width = `${Math.max(0, naturalWidth - tightening)}px`;
    });
    setIsReady(true);

    // 2. Individual Hover Logic
    charsInner.forEach((char) => {
      const onEnter = () => {
        gsap.to(char, {
          fontVariationSettings: `'wght' ${Math.floor(Math.random() * 200) + 100}`,
          color: colors[Math.floor(Math.random() * colors.length)],
          scale: 1.3,
          rotation: Math.random() * 20 - 10,
          duration: 0.2,
          ease: "back.out(2)",
          overwrite: true,
          zIndex: 10,
        });
      };

      const onLeave = () => {
        gsap.to(char, {
          fontVariationSettings: "'wght' 900",
          color: "inherit",
          scale: 1,
          rotation: 0,
          duration: 0.4,
          ease: "power2.inOut",
          overwrite: true,
          zIndex: 1,
        });
      };

      char.addEventListener("mouseenter", onEnter);
      char.addEventListener("mouseleave", onLeave);
    });

    // 3. The Sequential Toggle Effect (Every 7 seconds) — word by word
    const triggerSequentialWave = () => {
      const tl = gsap.timeline({ delay });

      // Group char elements by word (split on spaces in original text)
      const words = [];
      let currentWord = [];
      Array.from(charsInner).forEach((charEl, i) => {
        if (text[i] === " ") {
          if (currentWord.length > 0) {
            words.push([...currentWord]);
            currentWord = [];
          }
        } else {
          currentWord.push(charEl);
        }
      });
      if (currentWord.length > 0) words.push(currentWord);

      // Animate each word: morph in letter by letter, then reset, then next word
      words.forEach((wordChars) => {
        const staggerEach = 0.04;

        // Morph in
        tl.to(wordChars, {
          fontVariationSettings: () => `'wght' ${Math.floor(Math.random() * 200) + 100}`,
          color: () => colors[Math.floor(Math.random() * colors.length)],
          scale: 1.3,
          rotation: () => Math.random() * 20 - 10,
          duration: 0.15,
          stagger: { each: staggerEach, from: "start" },
          ease: "back.out(2)",
        });

        // Reset
        tl.to(wordChars, {
          fontVariationSettings: "'wght' 900",
          color: "inherit",
          scale: 1,
          rotation: 0,
          duration: 0.2,
          stagger: { each: staggerEach, from: "start" },
          ease: "power2.inOut",
        });
      });
    };

    const interval = setInterval(triggerSequentialWave, 7000);
    
    // Optional: run once shortly after load
    const initialTimer = setTimeout(triggerSequentialWave, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [text]);

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{
        display: "flex",
        justifyContent: "center",
        opacity: isReady ? 1 : 0,
        whiteSpace: "pre",
        letterSpacing: 0,
        padding: "0"
      }}
    >
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="char-wrapper"
          style={{ 
            display: "inline-flex",
            justifyContent: "center",
            position: "relative"
          }}
        >
          <span
            className="char-inner inline-block"
            style={{
              fontVariationSettings: "'wght' 900",
              willChange: "transform, font-variation-settings",
              pointerEvents: "auto",
              letterSpacing: 0
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        </span>
      ))}
    </div>
  );
};

export default HoverText;