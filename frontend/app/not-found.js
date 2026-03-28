import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-8xl font-bold text-gray-600">404</h1>
      <p className="text-2xl font-semibold">Page not found</p>
      <p className="text-gray-400">The page you're looking for doesn't exist.</p>
      <Link
        href="/"
        className="mt-4 px-6 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition"
      >
        Go home
      </Link>
    </div>
  );
}
