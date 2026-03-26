import { cookies } from "next/headers";
import SearchContent from "./SearchContent";

export default async function SearchPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  return (
    <div className="flex-1 px-10 py-8">
      <SearchContent userId={userId ? Number(userId) : null} />
    </div>
  );
}
