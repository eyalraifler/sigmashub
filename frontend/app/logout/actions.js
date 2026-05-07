"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server action — clear all auth cookies and redirect to the landing page.
 *
 * Deletes access_token, username, and user_id cookies,
 * then redirects the user to "/".
 *
 * @returns {never} Always redirects; never returns a value.
 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("username");
  cookieStore.delete("user_id");
  cookieStore.delete("is_admin");
  redirect("/");
}
