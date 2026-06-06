import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { enabled } = await req.json();
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });
  }
  await connectMongo();
  await User.updateOne(
    { email: session.user.email },
    { $set: { remindersEnabled: enabled } }
  );
  return NextResponse.json({ ok: true, remindersEnabled: enabled });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectMongo();
  const u = await User.findOne({ email: session.user.email }).lean<{ remindersEnabled?: boolean }>();
  return NextResponse.json({ remindersEnabled: u?.remindersEnabled ?? true });
}
