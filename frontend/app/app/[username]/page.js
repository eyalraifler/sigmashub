import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import AppContent from "../profile/AppContent";

export default async function UserProfilePage({ params }) {
  const { username } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const currentUsername = cookieStore.get("username")?.value;

  // Look up the profile owner by username
  const res = await fetch(
    `http://127.0.0.1:8000/api/users/by-username/${encodeURIComponent(username)}`,
    { cache: "no-store" }
  );

  if (!res.ok) notFound();

  const data = await res.json();
  if (!data.ok) notFound();

  const profileUserId = data.user.id;

  return (
    <main className="flex bg-black min-h-screen">
      <Sidebar username={currentUsername} />
      <div className="flex-1 overflow-y-auto">
        <AppContent
          userId={userId ? Number(userId) : null}
          profileUserId={profileUserId}
        />
      </div>
    </main>
  );
}
