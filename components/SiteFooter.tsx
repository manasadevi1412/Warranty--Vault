"use client";

import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row gap-4 sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow-sm">Colophon</div>
          <div className="mt-2 serif text-lg leading-tight">Warranty Vault.</div>
        </div>
        <div className="folio">© {new Date().getFullYear()} · Private Edition</div>
      </div>
    </footer>
  );
}
