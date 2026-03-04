"use client";
import { useState } from "react";
import Link from "next/link";
import { dancingScript } from "../fonts";
import { API_URL } from "../lib/config";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Something went wrong.");
      }
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <Link
        href="/"
        className={`${dancingScript.className} text-4xl font-semibold text-white mb-12 hover:text-orange-300 transition-colors`}
      >
        Sigmas Hub
      </Link>

      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
        <p className="text-white/50 mb-8 text-sm">
          Have a question or feedback? We&apos;d love to hear from you.
        </p>

        {status === "success" ? (
          <div className="rounded-xl border border-orange-400/40 bg-orange-400/10 px-6 py-8 text-center">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-white font-semibold text-lg mb-1">Message sent!</p>
            <p className="text-white/60 text-sm mb-6">
              Thanks for reaching out. We&apos;ll get back to you soon.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="rounded-full border border-orange-400/60 px-5 py-2 text-sm text-orange-300 hover:bg-orange-400/10 transition-colors"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-white/60">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Your name"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-orange-400/60 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-white/60">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-orange-400/60 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-white/60">Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={5}
                placeholder="What's on your mind?"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-orange-400/60 transition-colors resize-none"
              />
            </div>

            {status === "error" && (
              <p className="text-red-400 text-sm">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-1 rounded-full bg-orange-500 px-6 py-2.5 text-white font-semibold hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}
      </div>

      <Link href="/" className="mt-8 text-sm text-white/40 hover:text-white/70 transition-colors">
        ← Back to home
      </Link>
    </main>
  );
}
