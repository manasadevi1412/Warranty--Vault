import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { s3Configured, uploadToS3 } from "@/lib/s3";
import { compressImage } from "@/lib/image";
import crypto from "node:crypto";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3Configured()) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const compressed = await compressImage(buf, file.type);
  const safeEmail = session.user.email.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const key = `warranty-cards/${safeEmail}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${compressed.ext}`;

  const { url } = await uploadToS3({
    key,
    body: compressed.buffer,
    contentType: compressed.contentType,
  });
  return NextResponse.json({
    key,
    url,
    originalBytes: compressed.originalBytes,
    finalBytes: compressed.finalBytes,
  });
}
