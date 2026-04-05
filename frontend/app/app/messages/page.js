import { cookies } from "next/headers";
import MessagesContent from "./MessagesContent";

export default async function MessagesPage({ searchParams }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  const username = cookieStore.get("username")?.value;
  const { chat } = await searchParams;

  return (
    <MessagesContent
      userId={userId ? Number(userId) : null}
      username={username ?? null}
      initialChatId={chat ? Number(chat) : null}
    />
  );
}
