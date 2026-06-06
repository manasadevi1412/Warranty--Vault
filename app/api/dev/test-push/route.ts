import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { User } from "@/models/User";
import { adminMessaging } from "@/lib/firebase-admin";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 404 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const user = await User.findOne({ email: session.user.email }).lean<{
    fcmTokens?: string[];
  }>();
  const tokens = user?.fcmTokens ?? [];
  if (tokens.length === 0) {
    return NextResponse.json({ error: "No FCM tokens registered. Click 'Enable push' first." }, { status: 400 });
  }

  const messaging = adminMessaging();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/dashboard`;

  const results = await Promise.allSettled(
    tokens.map((token) =>
      messaging.send({
        token,
        notification: {
          title: "Test notification",
          body: `Sent at ${new Date().toLocaleTimeString()}`,
        },
        webpush: {
          fcmOptions: { link },
          notification: { icon: "/icon.svg" },
        },
        data: { link },
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => String(r.reason));

  return NextResponse.json({ tokens: tokens.length, sent, errors });
}
