import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const filename = request.headers.get("x-filename") ?? "audio";
  const contentType = request.headers.get("x-content-type") ?? "audio/mpeg";

  if (!request.body) {
    return NextResponse.json({ error: "No file body" }, { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: "public",
      contentType,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
