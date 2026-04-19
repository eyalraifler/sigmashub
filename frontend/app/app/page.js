import { cookies } from "next/headers";
import PostsFeed from "../components/PostsFeed";

export default async function AppPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  return (
    <div className="flex-1 px-4 py-4 md:px-10 md:py-8">
      <div className="max-w-[520px] mx-auto w-full">
        <PostsFeed userId={userId ? Number(userId) : null} />
      </div>
    </div>
  );
}
