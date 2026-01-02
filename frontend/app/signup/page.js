import SignupForm from "./SignUpForm";


export default function SignupPage() {
  async function handleSignup(formdata) {
    "use server";

    const email = formdata.get("email");
    const username = formdata.get("username");
    const password = formdata.get("password");
    
    if (!email || !username || !password) {
      return {ok: false, error: "Missing fields" };
    }

    const res = await fetch("http://127.0.0.1:8000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password}),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.detail || "Signup failed" };
    }

    return {ok: true };
  }

  return (
    <main>
      <h1 className="text-4xl mb-3">Sign up</h1>
      <SignupForm action={handleSignup} />
    </main>
  );

}
