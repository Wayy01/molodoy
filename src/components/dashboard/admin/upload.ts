"use client";

export type UploadFolder = "media" | "barbers" | "posts" | "locations";
export type Uploaded = { src: string; kind: "photo" | "video"; width: number | null; height: number | null };

export class UploadFailed extends Error {}

/** Sends one file to /api/upload. Rejects with UploadFailed(code) where code is a `dashAdmin.upload` key. */
export async function uploadFile(file: File, folder: UploadFolder): Promise<Uploaded> {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body });
  if (!res.ok) {
    const code = res.status === 413 ? "too_large" : ((await res.json().catch(() => null))?.error ?? "failed");
    throw new UploadFailed(code);
  }
  return res.json();
}

export function uploadErrorKey(error: unknown) {
  const code = error instanceof UploadFailed ? error.message : "failed";
  return ["too_large", "unsupported_type", "forbidden"].includes(code) ? code : "failed";
}
