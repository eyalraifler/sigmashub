"use client";

import { usePathname } from "next/navigation";

export default function TourFloatButton() {
    const pathname = usePathname();
    if (pathname !== "/app") return null;

    return (
        <button
            onClick={() => window.dispatchEvent(new Event("startTour"))}
            title="Take a Tour"
            className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white text-black font-bold text-xl shadow-lg hover:scale-110 hover:shadow-white/20 transition-transform duration-150 flex items-center justify-center"
        >
            ?
        </button>
    );
}
