import { NextResponse } from "next/server";

export async function GET(request) {
  const base = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/login", base));
  response.cookies.delete("auth_token");
  response.cookies.delete("access_token");
  response.cookies.delete("username");
  response.cookies.delete("user_id");
  return response;
}
