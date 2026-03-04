import { cookies } from "next/headers";
import Sidebar from "../../components/Sidebar";
import AppContent from "./AppContent.jsx";

export default async function CreatePostPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    const username = cookieStore.get("username")?.value;

    return (
        <main className="flex bg-black min-h-screen">
            <Sidebar username={username} />
            <AppContent userId={userId ? Number(userId) : null} username={username || "Name"} />
        </main>
    );
}