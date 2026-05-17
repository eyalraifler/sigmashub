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

  let tourCompleted = true;
  try {
    const userRes = await fetch(`http://127.0.0.1:8000/api/users/${userId}`, { cache: "no-store" });

    if (userRes.status === 404) {
      // User no longer exists in the database — clear stale cookies and force re-login
      redirect("/api/clear-session");
    }

    if (userRes.ok) {
      const userData = await userRes.json();
      tourCompleted = userData.user?.tour_completed ?? true;
    }
  } catch {
    // Backend temporarily unavailable — keep the user logged in with default values
  }

  return (
    <main className="bg-black min-h-screen">
      <Sidebar username={username} userId={userId ? Number(userId) : null} />
      <div className="md:pl-[68px] pt-14 md:pt-0 min-h-screen flex flex-col">
        {children}
      </div>
      <AppTourWrapper initialRun={!tourCompleted} />
      <TourFloatButton />
    </main>
  );
}
