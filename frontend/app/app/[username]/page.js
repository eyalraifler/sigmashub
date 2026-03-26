import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import AppContent from "../profile/AppContent";

export default async function UserProfilePage({ params, searchParams }) {
  const { username } = await params;
  const { post: postId } = await searchParams;
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  const res = await fetch(
    `http://127.0.0.1:8000/api/users/by-username/${encodeURIComponent(username)}`,
    { cache: "no-store" }
  );

  if (!res.ok) notFound();

  const data = await res.json();
  if (!data.ok) notFound();

  const profileUserId = data.user.id;

  return (
    <div className="flex-1 overflow-y-auto">
      <AppContent
        userId={userId ? Number(userId) : null}
        profileUserId={profileUserId}
        initialPostId={postId ? Number(postId) : null}
      />
    </div>
  );
}
