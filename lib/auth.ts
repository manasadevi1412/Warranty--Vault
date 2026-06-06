import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectMongo } from "./mongodb";
import { User } from "@/models/User";

async function upsertUser(email: string, name?: string | null, image?: string | null) {
  try {
    await connectMongo();
    await User.updateOne(
      { email },
      { $setOnInsert: { email, name: name || "", image: image || "" } },
      { upsert: true }
    );
  } catch (err) {
    console.error("upsertUser failed:", err);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      // Fire-and-forget so a slow Mongo connection can't break the OAuth callback.
      // Worst case: the user record is created lazily on the next API call.
      upsertUser(user.email, user.name, user.image);
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
