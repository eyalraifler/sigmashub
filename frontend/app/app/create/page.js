import { cookies } from "next/headers";
import AppContent from "./AppContent.jsx";

export default async function CreatePostPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    const username = cookieStore.get("username")?.value;

    return <AppContent userId={userId ? Number(userId) : null} username={username || "Name"} />;
}
