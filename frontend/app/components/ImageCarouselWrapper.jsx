"use client";

import { useState, useEffect } from "react";
import { dancingScript } from "../fonts";


export default function ImageCarouselWrapper() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    "/signup_image_1.png",
    "/signup_image_2.png",
    "/signup_image_3.png",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 8000); // Changed to 8 seconds

    return () => clearInterval(interval);
  }, [currentIndex]); // Reset timer whenever currentIndex changes

  const handleImageSelect = (idx) => {
    setCurrentIndex(idx);
    // Timer will automatically reset due to dependency on currentIndex
  };

  return (
    <div className="hidden lg:block w-fit h-screen relative bg-neutral-900">
      
      {/* Logo */}
      <div className="absolute top-6 left-8 z-10 text-2xl text-white">
        <h1 className={`${dancingScript.className} pointy text-3xl font-semibold tracking-wide`}>
          Sigmas Hub
        </h1>
      </div>

      {/* Images */}
      <div className="relative h-full">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`Signup ${idx + 1}`}
            className={`
              h-full w-auto transition-opacity duration-1000
              ${idx === currentIndex ? "opacity-100 relative" : "opacity-0 absolute inset-0"}
            `}
          />
        ))}
      </div>

      {/* Indicator lines */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex gap-3">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleImageSelect(idx)}
            className={`h-1 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-12 bg-white"
                : "w-8 bg-gray-400/50 hover:bg-gray-300/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}