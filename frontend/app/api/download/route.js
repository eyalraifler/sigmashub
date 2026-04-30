import { NextResponse } from "next/server";

/**
 * Next.js route handler — proxy a media file from the backend for download.
 *
 * Reads a `path` query parameter, fetches the file from the backend,
 * and streams it back to the client with a Content-Disposition header
 * that triggers a browser download.
 *
 * @param {Request} request - The incoming Next.js request object.
 * @returns {NextResponse} The file stream with download headers, or an error response.
 */
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
