import LoginForm from "./LoginForm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function LoginPage() {
  async function handleSubmit(prevState, formData) {
    "use server";
    const email = formData.get("email");
    const password = formData.get("password");
    console.log({ email, password });

    if (!email || !password) {
      return{ ok:false, error: "Missing email or password" }
    }

    const res = await fetch("http://127.0.0.1:8000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    

    const data = await res.json().catch(() => ({}));

    const username = data.user?.username;

    if (!res.ok) {
      return { ok: false, error: data.detail || "Invalid email or password" };
    }

    const token = data.token;
    if (!token) return { error: "No token returned" };

    const cookieStore = await cookies();

    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    cookieStore.set("username", username || "", {
      httpOnly: false, // optional - if you want client JS to read it too
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    console.log("ALL COOKIES:", cookieStore.getAll());


    redirect("/app");
  }

  return (
    <main>
      <h1 className="text-4xl mb-3">Login</h1>
      <LoginForm action={handleSubmit} />
    </main>
  );
}
