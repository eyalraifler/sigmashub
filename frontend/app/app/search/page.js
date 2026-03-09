import { cookies } from "next/headers";
import Sidebar from "../../components/Sidebar";
import SearchContent from "./SearchContent";

export default async function SearchPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const username = cookieStore.get("username")?.value;

  return (
    <main className="flex bg-black min-h-screen">
      <Sidebar username={username} userId={userId ? Number(userId) : null} />
      <div className="flex-1 px-10 py-8">
        <SearchContent userId={userId ? Number(userId) : null} />
      </div>
    </main>
  );
}
