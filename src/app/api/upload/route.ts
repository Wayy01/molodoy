import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { storeUpload, UploadError } from "@/lib/uploads";

const FOLDERS = ["media", "barbers", "posts", "locations"] as const;

/** POST multipart { file, folder } -> { src, kind, width, height }. Owners and managers only. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role === "barber") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  const folder = FOLDERS.find((f) => f === form.get("folder")) ?? "media";
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "missing_file" }, { status: 400 });

  try {
    return NextResponse.json(await storeUpload(file, folder));
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.code }, { status: 400 });
    throw e;
  }
}
