import { NextResponse } from "next/server";

/**
 * Next.js route handler — clear all auth cookies and redirect to login.
 *
 * Used as a fallback session-clearing endpoint (e.g. when server-side
 * cookie deletion is needed without running the logout server action).
 *
 * @param {Request} request - The incoming Next.js request object.
 * @returns {NextResponse} A redirect response to /login with cleared cookies.
 */
export async function GET(request) {
  const base = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/login", base));
  response.cookies.delete("access_token");
  response.cookies.delete("username");
  response.cookies.delete("user_id");
  return response;
}
