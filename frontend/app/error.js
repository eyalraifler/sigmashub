"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-8xl font-bold text-gray-600">500</h1>
      <p className="text-2xl font-semibold">Something went wrong</p>
      <p className="text-gray-400">An unexpected error occurred on the server.</p>
      <div className="flex gap-4 mt-4">
        <button
          onClick={reset}
          className="px-6 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-2 border border-white text-white rounded-full font-semibold hover:bg-white hover:text-black transition"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
