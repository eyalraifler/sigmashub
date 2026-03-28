import { cookies } from "next/headers";
import Sidebar from "../components/Sidebar";
import AppTourWrapper from "../components/AppTourWrapper";
import TourFloatButton from "../components/TourFloatButton";

export default async function AppLayout({ children }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const username = cookieStore.get("username")?.value;

  const userRes = await fetch(`http://127.0.0.1:8000/api/users/${userId}`, { cache: "no-store" });
  const userData = await userRes.json();
  const tourCompleted = userData.user?.tour_completed ?? true;

  return (
    <main className="flex bg-black min-h-screen">
      <Sidebar username={username} userId={userId ? Number(userId) : null} />
      {children}
      <AppTourWrapper initialRun={!tourCompleted} />
    </main>
  );
}
