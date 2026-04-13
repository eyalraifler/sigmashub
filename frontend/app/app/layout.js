import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "../components/Sidebar";
import AppTourWrapper from "../components/AppTourWrapper";
import TourFloatButton from "../components/TourFloatButton";

export default async function AppLayout({ children }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const username = cookieStore.get("username")?.value;

  if (!userId) {
    redirect("/login");
  }

  const userRes = await fetch(`http://127.0.0.1:8000/api/users/${userId}`, { cache: "no-store" });

  if (userRes.status === 404) {
    // User no longer exists in the database — clear stale cookies and force re-login
    redirect("/api/clear-session");
  }

  const userData = await userRes.json();
  const tourCompleted = userData.user?.tour_completed ?? true;

  return (
    <main className="bg-black min-h-screen">
      <Sidebar username={username} userId={userId ? Number(userId) : null} />
      <div style={{ paddingLeft: 68 }} className="min-h-screen flex flex-col">
        {children}
      </div>
      <AppTourWrapper initialRun={!tourCompleted} />
      <TourFloatButton />
    </main>
  );
}
