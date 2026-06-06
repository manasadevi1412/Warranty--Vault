"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiGrid, FiUsers, FiArchive, FiLogOut } from "react-icons/fi";

export default function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row">
      <aside className="md:w-60 md:min-h-screen border-b md:border-b-0 md:border-r border-rule bg-paper-2 md:sticky md:top-0 md:flex md:flex-col">
        <div className="px-5 py-6">
          <div className="flex items-baseline gap-2">
            <span
              className="serif text-xl tracking-tight"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
            >
              Warranty
            </span>
            <span className="folio text-accent">№ Admin</span>
          </div>
        </div>

        <nav className="px-3 pb-6 flex md:flex-col gap-1 overflow-x-auto">
          <NavItem href="/admin" label="Overview" icon={<FiGrid />} active={pathname === "/admin"} />
          <NavItem href="/admin/users" label="Users" icon={<FiUsers />} active={pathname.startsWith("/admin/users")} />
          <NavItem
            href="/admin/warranties"
            label="Warranties"
            icon={<FiArchive />}
            active={pathname.startsWith("/admin/warranties")}
          />
        </nav>

        <div className="hidden md:block px-5 mt-auto pb-6">
          <div className="rule-thin pt-4">
            <div className="eyebrow-sm">Signed in as</div>
            <div className="text-sm text-ink truncate mt-1">{email}</div>
            <button
              onClick={logout}
              className="mt-3 inline-flex items-center gap-2 eyebrow text-ink-2 hover:text-accent transition-colors"
            >
              <FiLogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="md:hidden px-5 py-3 border-b border-rule flex items-center justify-between bg-paper-2">
          <div className="folio truncate">{email}</div>
          <button onClick={logout} className="eyebrow text-ink-2 hover:text-accent">
            Sign out
          </button>
        </div>
        <div className="px-5 sm:px-8 py-8 sm:py-10 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-sm flex items-center gap-3 text-sm transition-colors whitespace-nowrap ${
        active ? "bg-paper text-accent" : "text-ink-2 hover:text-ink hover:bg-paper"
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
