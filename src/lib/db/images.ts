// Image storage: save base64 images to disk, serve via API route
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const IMAGE_DIR = path.join(process.cwd(), "data", "images");

async function ensureDir() {
  if (!existsSync(IMAGE_DIR)) {
    await mkdir(IMAGE_DIR, { recursive: true });
  }
}

/**
 * Save a base64 data URL to disk as a PNG file.
 * Returns the relative path (for storage in DB) and the serving URL.
 */
export async function saveImage(
  nodeId: string,
  base64DataUrl: string
): Promise<{ relativePath: string; servingUrl: string }> {
  await ensureDir();

  // Strip data URL prefix: "data:image/png;base64,..." → raw base64
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  // Determine extension from the data URL
  const ext = /^data:image\/(\w+);/.exec(base64DataUrl)?.[1] ?? "png";

  const filename = `${nodeId}.${ext}`;
  const filepath = path.join(IMAGE_DIR, filename);
  await writeFile(filepath, buffer);

  return {
    relativePath: `images/${filename}`,
    servingUrl: `/api/images/${nodeId}`,
  };
}

/**
 * Read an image from disk. Returns the buffer and content type, or null if not found.
 */
export async function loadImage(
  nodeId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  await ensureDir();

  // Try common extensions
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const filepath = path.join(IMAGE_DIR, `${nodeId}.${ext}`);
    if (existsSync(filepath)) {
      const buffer = await readFile(filepath);
      const contentType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      return { buffer, contentType };
    }
  }
  return null;
}
