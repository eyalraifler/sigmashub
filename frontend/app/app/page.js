import { cookies } from "next/headers";
import Sidebar from "../components/Sidebar";
import PostsFeed from "../components/PostsFeed";
import LogoutButton from "../components/LogoutButton";

export default async function AppPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const username = cookieStore.get("username")?.value;


  return (
    <main className="flex bg-black min-h-screen">
      <Sidebar username={username} />
      <div className="flex-1 px-10 py-8">
        <h1>Welcome {username}! </h1>
        <LogoutButton />
        <div className="max-w-[520px] mx-auto">
          <PostsFeed userId={userId ? Number(userId) : null} />
        </div>
      </div>
    </main>
  );
}

