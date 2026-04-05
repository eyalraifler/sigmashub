import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SettingsContent from "./SettingsContent";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) redirect("/login");

  return <SettingsContent userId={Number(userId)} />;
}
