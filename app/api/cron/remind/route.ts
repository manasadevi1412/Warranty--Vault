import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { Warranty } from "@/models/Warranty";
import { User } from "@/models/User";
import { adminMessaging } from "@/lib/firebase-admin";

// GET /api/cron/remind?secret=...
// Sends a push to users whose warranties expire within REMIND_DAYS (default 30)
// and that haven't been notified in the last 24h.
const REMIND_DAYS = [30, 14, 7, 3, 1];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectMongo();

  const now = new Date();
  const horizon = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const candidates = await Warranty.find({
    remindersEnabled: true,
    expiryDate: { $gte: now, $lte: horizon },
    $or: [{ lastReminderSentAt: { $exists: false } }, { lastReminderSentAt: { $lt: oneDayAgo } }],
  }).lean<Array<{
    _id: import("mongoose").Types.ObjectId;
    userEmail: string;
    productName: string;
    companyName: string;
    expiryDate: Date;
  }>>();

  const messaging = adminMessaging();
  let sent = 0;
  const errors: string[] = [];

  for (const w of candidates) {
    const days = Math.ceil((new Date(w.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (!REMIND_DAYS.includes(days)) continue;

    const user = await User.findOne({ email: w.userEmail, remindersEnabled: true }).lean<{
      fcmTokens?: string[];
    }>();
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) continue;

    const title = `Warranty expiring in ${days} day${days === 1 ? "" : "s"}`;
    const body = `${w.companyName || "Your product"} ${w.productName ? "- " + w.productName : ""}`.trim();

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/warranty/${w._id.toString()}`;

    const results = await Promise.allSettled(
      user.fcmTokens.map((token) =>
        messaging.send({
          token,
          notification: { title, body },
          webpush: {
            fcmOptions: { link },
            notification: { icon: "/icon.svg" },
          },
          data: {
            warrantyId: w._id.toString(),
            link,
          },
        })
      )
    );
    sent += results.filter((r) => r.status === "fulfilled").length;
    for (const r of results) if (r.status === "rejected") errors.push(String(r.reason));

    await Warranty.updateOne({ _id: w._id }, { $set: { lastReminderSentAt: now } });
  }

  return NextResponse.json({ checked: candidates.length, sent, errors: errors.slice(0, 5) });
}
