import LoginForm from "./LoginForm";

export default function LoginPage() {
  async function handleSubmit(formData) {
    "use server";
    const email = formData.get("email");
    const password = formData.get("password");
    console.log({ email, password });
  }

  return (
    <main>
      <h1 className="text-4xl mb-3">Login</h1>
      <LoginForm action={handleSubmit} />
    </main>
  );
}
