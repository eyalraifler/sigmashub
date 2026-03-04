import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
  if (username) redirect(`/app/${username}`);
  redirect("/app");
}
