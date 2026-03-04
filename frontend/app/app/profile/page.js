import { cookies } from "next/headers";
import Sidebar from "../../components/Sidebar";
import AppContent from "./AppContent";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  return (
    <main className="flex bg-black min-h-screen">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <AppContent
          userId={userId ? Number(userId) : null}
          profileUserId={userId ? Number(userId) : null}
        />
      </div>
    </main>
  );
}
