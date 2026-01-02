export default function SignupForm({ action }) {
  return (
    <form action={action} className="">
      <label>
        Email
        <input name="email" type="email" required />
      </label>

      <label>
        Username
        <input name="username" type="text" required />
      </label>

      <label>
        Password
        <input name="password" type="password" required />
      </label>

      <button type="submit">Create account</button>
    </form>
  );
}
