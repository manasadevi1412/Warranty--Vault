import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { Warranty } from "@/models/Warranty";
import { deleteFromS3, s3Configured } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await connectMongo();
  const w = await Warranty.findOne({ _id: id, userEmail: session.user.email }).lean();
  if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ warranty: w });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  await connectMongo();
  const updated = await Warranty.findOneAndUpdate(
    { _id: id, userEmail: session.user.email },
    { $set: body },
    { returnDocument: "after" }
  ).lean();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ warranty: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await connectMongo();
  const doc = await Warranty.findOneAndDelete({ _id: id, userEmail: session.user.email }).lean<{
    imageKey?: string;
  }>();
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.imageKey && s3Configured()) {
    deleteFromS3(doc.imageKey).catch((err) => console.error("S3 delete failed:", err));
  }
  return NextResponse.json({ ok: true });
}
