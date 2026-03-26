import { cookies } from "next/headers";
import Sidebar from "../components/Sidebar";
import PostsFeed from "../components/PostsFeed";
import AppTourWrapper from "../components/AppTourWrapper";

export default async function AppPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const username = cookieStore.get("username")?.value;
  const userRes = await fetch(`http://127.0.0.1:8000/api/users/${userId}`);
  const userData = await userRes.json();
  const tourCompleted = userData.user?.tour_completed;



  return (
    <main className="flex bg-black min-h-screen">
      <Sidebar username={username} userId={userId ? Number(userId) : null} />
      <div className="flex-1 px-10 py-8">
        <div className="max-w-[520px] mx-auto">
          <PostsFeed userId={userId ? Number(userId) : null} />
        </div>
      </div>
      {!tourCompleted && <AppTourWrapper userId={userId} />}
    </main>
  );
}

