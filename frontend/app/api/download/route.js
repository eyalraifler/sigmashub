import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return new NextResponse("Missing path", { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const fileUrl = `${apiUrl}${path}`;

  const res = await fetch(fileUrl);
  if (!res.ok) {
    return new NextResponse("Failed to fetch file", { status: res.status });
  }

  const filename = path.split("/").pop();

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
