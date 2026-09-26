import { NextRequest, NextResponse } from "next/server";
import { loadImage } from "@/lib/db/images";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await params;
  const image = await loadImage(nodeId);

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.buffer), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
