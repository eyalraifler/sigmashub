import LogoutButton from "../components/LogoutButton";
import { cookies } from "next/headers";
import Sidebar from "../components/Sidebar";

export default async function CreatePostPage() {

    const cookies = await cookies();
    const username = cookies.get("username")?.value;

    return (
        <main className="bg-[#141D29]">
            <Sidebar />
        </main>


    )

}