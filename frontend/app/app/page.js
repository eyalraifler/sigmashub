import LogoutButton from "../components/LogoutButton";
import { cookies } from "next/headers";
import Sidebar from "../components/Sidebar";

export default async function AppPage() {

  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
  return (
    <main className="bg-[#141D29]">
      <Sidebar />
        <h1>Welcome {username}! </h1>

      <div className="px-10 py-8">
        <div className="max-w-[520px] mx-auto">
          <div className="border border-white/10 bg-white/5 h-[800px] flex items-center justify-center">
          Your posts go here 
          <h1>Welcome {username}! </h1>
          <LogoutButton />

        </div>
      </div>
    </div>
    <h1>Welcome {username}! </h1>
    <LogoutButton />
    </main>

  );
}

