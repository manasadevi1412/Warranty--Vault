"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (pathname?.startsWith("/admin")) return null;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const authed = status === "authenticated";

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-rule">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8">
        <div className="h-16 flex items-center justify-between gap-6">
          {/* Brand */}
          <Link href="/" className="flex items-baseline gap-2 group">
            <span className="serif text-xl sm:text-2xl tracking-tight" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}>
              Warranty
            </span>
            <span className="folio mt-0.5 group-hover:text-accent transition-colors">№ Vault</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {authed && (
              <>
                <NavLink href="/dashboard" label="Archive" active={pathname === "/dashboard"} />
                <NavLink href="/upload" label="New entry" active={pathname === "/upload"} />
              </>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <ThemeToggle className="hidden md:inline-flex" />
            {authed ? (
              <div className="hidden md:flex items-center gap-3">
                <UserChip
                  name={session?.user?.name || session?.user?.email || ""}
                  image={session?.user?.image || ""}
                />
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="eyebrow hover:text-accent transition-colors px-2 py-1"
                >
                  Sign out
                </button>
              </div>
            ) : status === "unauthenticated" ? (
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="btn btn-ink hidden md:inline-flex"
              >
                Sign in
              </button>
            ) : null}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-ink"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden border-t border-rule bg-paper-2">
          <div className="max-w-[1100px] mx-auto px-5 py-6 flex flex-col gap-1">
            <div className="flex items-center justify-between px-1 pb-3 border-b border-rule">
              <span className="eyebrow-sm">Appearance</span>
              <ThemeToggle />
            </div>
            {authed ? (
              <>
                <MobileLink href="/dashboard" label="Archive" />
                <MobileLink href="/upload" label="New entry" />
                <div className="rule-thin my-4" />
                <div className="flex items-center gap-3 px-1 py-2">
                  {session?.user?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      className="w-10 h-10 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="eyebrow-sm">Signed in as</div>
                    <div className="serif text-base truncate">
                      {session?.user?.name || session?.user?.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="btn btn-outline w-full mt-3"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="btn btn-ink w-full"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative px-3 py-2 eyebrow transition-colors ${
        active ? "text-accent" : "text-ink-2 hover:text-ink"
      }`}
    >
      {label}
      {active && (
        <span className="absolute left-3 right-3 -bottom-px h-px bg-accent" aria-hidden />
      )}
    </Link>
  );
}

function MobileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="py-3 px-1 serif text-2xl border-b border-rule flex items-center justify-between"
      style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
    >
      <span>{label}</span>
      <span className="folio">→</span>
    </Link>
  );
}

function UserChip({ name, image }: { name: string; image: string }) {
  return (
    <div className="flex items-center gap-2 pl-3 pr-1 py-1 border-l border-rule">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
      )}
      <span className="text-sm text-ink truncate max-w-[140px]">{name}</span>
    </div>
  );
}
