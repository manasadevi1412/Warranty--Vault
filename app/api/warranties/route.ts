import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { Warranty } from "@/models/Warranty";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectMongo();
  const list = await Warranty.find({ userEmail: session.user.email }).sort({ expiryDate: 1 }).lean();
  return NextResponse.json({ warranties: list });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.expiryDate) {
    return NextResponse.json({ error: "expiryDate is required" }, { status: 400 });
  }
  await connectMongo();
  const created = await Warranty.create({
    userEmail: session.user.email,
    productName: body.productName || "",
    companyName: body.companyName || "",
    companyPhone: body.companyPhone || "",
    serialNumber: body.serialNumber || "",
    purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
    expiryDate: new Date(body.expiryDate),
    notes: body.notes || "",
    imageUrl: body.imageUrl || "",
    imageKey: body.imageKey || "",
    imageData: body.imageData || "",
  });
  return NextResponse.json({ warranty: created }, { status: 201 });
}
