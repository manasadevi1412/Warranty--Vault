import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeImageWithGemini, geminiConfigured } from "@/lib/gemini";
import { compressImage } from "@/lib/image";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!geminiConfigured()) {
    return NextResponse.json({ error: "Analyzer not configured" }, { status: 503 });
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
  const parsed = await analyzeImageWithGemini(
    compressed.buffer.toString("base64"),
    compressed.contentType
  );
  if (!parsed) {
    return NextResponse.json({ error: "Analysis failed" }, { status: 502 });
  }
  return NextResponse.json({ parsed });
}
