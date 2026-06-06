"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { FcGoogle } from "react-icons/fc";

const ERROR_COPY: Record<string, string> = {
  OAuthCallback:
    "Google returned, but we couldn't complete the handshake. Often a flaky network or a slow database. Try again.",
  OAuthSignin: "Google sign-in could not be started. Check your connection and try again.",
  AccessDenied: "Access denied. Try signing in again, or use a different Google account.",
  Configuration: "Sign-in is mis-configured on the server. Check the .env settings.",
  default: "Something went wrong with sign-in. Try once more.",
};

function LoginInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/dashboard";
  const errorKey = search.get("error");
  const errorMessage = errorKey ? ERROR_COPY[errorKey] || ERROR_COPY.default : null;

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, callbackUrl, router]);

  if (session) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-[480px]">
        <div className="flex items-center justify-between">
          <span className="folio">Vol. 01 · Members&apos; Entrance</span>
          <span className="folio">№ Auth</span>
        </div>
        <div className="rule-thick mt-3" />

        <div className="pt-12 pb-10">
          <div className="eyebrow">A private archive</div>
          <h1 className="display text-[14vw] sm:text-[72px] mt-4 leading-[0.95]">
            Welcome<br />
            <span className="display-italic text-accent">back.</span>
          </h1>
          <p className="serif text-base text-ink-2 mt-6 max-w-[36ch]">
            Sign in to manage your warranties and quietly receive expiry notices
            before anything lapses.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 border-l-2 border-accent pl-4 py-2">
            <div className="eyebrow-sm text-accent mb-1">Sign-in error · {errorKey}</div>
            <p className="serif text-sm text-ink leading-snug">{errorMessage}</p>
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 border border-ink hover:bg-ink hover:text-paper-2 transition-colors group"
        >
          <span className="flex items-center gap-3">
            <FcGoogle className="text-2xl" />
            <span className="serif text-lg">{errorMessage ? "Try again" : "Continue with Google"}</span>
          </span>
          <span className="folio group-hover:text-paper-2 transition-colors">↗</span>
        </button>

        <p className="mt-8 text-xs text-ink-3 leading-relaxed">
          By continuing you agree to keep your own records.
          We never sell or share what&apos;s in your archive.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh]" />}>
      <LoginInner />
    </Suspense>
  );
}
