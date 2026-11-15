import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export type StoredUpload = { src: string; kind: "photo" | "video"; width: number | null; height: number | null };

/** Images are re-encoded to WebP (max 2000px, EXIF stripped); videos are stored as-is. */
export async function storeUpload(file: File, folder: "media" | "barbers" | "posts" | "locations"): Promise<StoredUpload> {
  const month = new Date().toISOString().slice(0, 7);
  const dir = path.join(UPLOAD_ROOT, folder, month);
  await mkdir(dir, { recursive: true });
  const id = crypto.randomUUID().slice(0, 12);

  if (IMAGE_TYPES.has(file.type)) {
    if (file.size > MAX_IMAGE_BYTES) throw new UploadError("too_large");
    const input = Buffer.from(await file.arrayBuffer());
    const { data, info } = await sharp(input)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    const name = `${id}.webp`;
    await writeFile(path.join(dir, name), data);
    return { src: `/uploads/${folder}/${month}/${name}`, kind: "photo", width: info.width, height: info.height };
  }

  const ext = VIDEO_TYPES[file.type];
  if (ext) {
    if (file.size > MAX_VIDEO_BYTES) throw new UploadError("too_large");
    const name = `${id}.${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return { src: `/uploads/${folder}/${month}/${name}`, kind: "video", width: null, height: null };
  }

  throw new UploadError("unsupported_type");
}

export class UploadError extends Error {
  constructor(public code: "too_large" | "unsupported_type") {
    super(code);
  }
}
