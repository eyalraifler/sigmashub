import LogoutButton from "../components/LogoutButton";
import { cookies } from "next/headers";

export default async function AppPage() {

  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
  return (
    <main>
      <h1>Welcome {username}! </h1>
      <LogoutButton />
    </main>
  );
}
