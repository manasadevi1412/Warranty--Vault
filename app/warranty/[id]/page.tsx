"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiPhoneCall,
  FiBell,
  FiBellOff,
  FiTrash2,
  FiMaximize2,
} from "react-icons/fi";
import Lightbox from "@/components/Lightbox";

type Warranty = {
  _id: string;
  productName: string;
  companyName: string;
  companyPhone: string;
  serialNumber: string;
  purchaseDate?: string;
  expiryDate: string;
  notes?: string;
  remindersEnabled: boolean;
  imageUrl?: string;
  imageData?: string;
};

export default function WarrantyDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [w, setW] = useState<Warranty | null>(null);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => Date.now());
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=/warranty/${id}`);
    }
  }, [status, id, router]);

  useEffect(() => {
    if (status !== "authenticated" || !id) return;
    fetch(`/api/warranties/${id}`)
      .then((r) => r.json())
      .then((d) => setW(d.warranty))
      .finally(() => setLoading(false));
  }, [status, id]);

  async function setReminders(enabled: boolean) {
    if (!w) return;
    setW({ ...w, remindersEnabled: enabled });
    await fetch(`/api/warranties/${w._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindersEnabled: enabled }),
    });
    toast.success(enabled ? "Reminders on for this entry" : "Reminders paused");
  }

  async function remove() {
    if (!w) return;
    if (!confirm("Remove this entry from the archive?")) return;
    await fetch(`/api/warranties/${w._id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  if (status !== "authenticated") return null;
  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-20">
        <div className="folio text-center text-ink-3">Opening the entry…</div>
      </div>
    );
  }
  if (!w) {
    return (
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-20 text-center">
        <div className="eyebrow mb-4">404</div>
        <h1 className="display text-6xl">Not in the archive.</h1>
        <Link href="/dashboard" className="link mt-8 inline-block">← Back to dashboard</Link>
      </div>
    );
  }

  const days = Math.ceil((new Date(w.expiryDate).getTime() - now) / 86_400_000);
  const expired = days < 0;
  const soon = !expired && days <= 30;
  const img = w.imageUrl || w.imageData;
  const expiryDate = new Date(w.expiryDate);
  const purchaseDate = w.purchaseDate ? new Date(w.purchaseDate) : null;
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="max-w-[1100px] mx-auto px-5 sm:px-8">
      {/* Masthead */}
      <div className="pt-10 sm:pt-14 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="folio inline-flex items-center gap-2 hover:text-accent transition-colors">
          <FiArrowLeft /> Back to archive
        </Link>
        <div className="folio hidden sm:block">Entry №{w._id.slice(-6).toUpperCase()}</div>
      </div>
      <div className="rule-thick mt-3" />

      {/* Article header */}
      <header className="pt-10 sm:pt-16 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="eyebrow mb-5">
            Warranty · {w.companyName || "Unknown brand"}
          </div>
          <h1 className="display text-[12vw] sm:text-[88px] lg:text-[112px] leading-[0.92]">
            {w.productName || (
              <span className="display-italic text-ink-3">Untitled product</span>
            )}
          </h1>
          {w.notes && (
            <p className="serif text-xl text-ink-2 mt-8 max-w-[44ch] leading-relaxed">
              <span className="display-italic text-accent">&ldquo;</span>
              {w.notes}
              <span className="display-italic text-accent">&rdquo;</span>
            </p>
          )}
        </div>

        {/* Status pillar */}
        <aside className="lg:col-span-4 lg:pl-8 lg:border-l lg:border-rule flex flex-col gap-6">
          <div>
            <div className="eyebrow-sm">Status</div>
            <div
              className={`display text-4xl mt-2 leading-tight ${
                expired ? "text-oxblood" : soon ? "text-ochre" : "text-olive"
              }`}
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
            >
              {expired ? "Lapsed" : soon ? "Expiring" : "In force"}
            </div>
            <div className="mono text-sm text-ink-2 mt-2">
              {expired ? `${Math.abs(days)} days ago` : `${days} days remaining`}
            </div>
          </div>

          <div className="rule-thin pt-5">
            <div className="eyebrow-sm">Reminders</div>
            <div className="mono text-sm mt-2">
              {w.remindersEnabled ? "Active · 30·14·7·3·1 days out" : "Paused"}
            </div>
          </div>
        </aside>
      </header>

      {/* Two-column body */}
      <section className="mt-16 grid lg:grid-cols-12 gap-10">
        {/* Image */}
        <div className="lg:col-span-6 order-2 lg:order-1">
          <div className="eyebrow mb-3">Plate I · The document</div>
          {img ? (
            <button
              onClick={() => setZoom(true)}
              className="block w-full bg-paper-3 border border-rule overflow-hidden group relative"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="warranty card" className="w-full h-auto object-contain" />
              <span className="absolute top-3 right-3 px-3 py-2 bg-paper-2/90 backdrop-blur-sm folio inline-flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <FiMaximize2 /> View full
              </span>
            </button>
          ) : (
            <div className="aspect-[3/4] border border-dashed border-rule-2 flex items-center justify-center text-ink-3">
              <div className="text-center">
                <div className="folio">No image filed</div>
              </div>
            </div>
          )}
        </div>

        {/* Specifications */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          <div className="eyebrow mb-3">Specifications</div>
          <dl className="border-t border-ink">
            <Row label="Brand" value={w.companyName || "—"} mono={false} />
            <Row label="Product" value={w.productName || "—"} mono={false} />
            <Row label="Serial number" value={w.serialNumber || "—"} mono />
            {purchaseDate && <Row label="Purchased" value={fmt(purchaseDate)} mono />}
            <Row label="Expires" value={fmt(expiryDate)} mono accent />
            {w.companyPhone && <Row label="Support" value={w.companyPhone} mono />}
          </dl>

          {/* Actions */}
          <div className="mt-10 flex flex-wrap gap-3">
            {w.companyPhone && (
              <a href={`tel:${w.companyPhone}`} className="btn btn-accent">
                <FiPhoneCall /> Call {w.companyName || "support"}
              </a>
            )}
            <button onClick={() => setReminders(!w.remindersEnabled)} className="btn btn-outline">
              {w.remindersEnabled ? <FiBellOff /> : <FiBell />}
              {w.remindersEnabled ? "Pause reminders" : "Resume reminders"}
            </button>
            <button onClick={remove} className="btn btn-ghost text-oxblood border-rule">
              <FiTrash2 /> Remove
            </button>
          </div>
        </div>
      </section>

      {/* Footnote */}
      <div className="mt-20 mb-16 rule-thin pt-6 flex items-center justify-between">
        <p className="folio">
          Filed {new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
        </p>
        <Link href="/dashboard" className="folio hover:text-accent transition-colors">
          ← Back to archive
        </Link>
      </div>

      {zoom && img && (
        <Lightbox
          src={img}
          alt={`${w.companyName} warranty card`}
          caption={`${w.companyName} · ${w.productName}`}
          onClose={() => setZoom(false)}
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-4 py-4 border-b border-rule">
      <dt className="eyebrow-sm pt-1">{label}</dt>
      <dd
        className={`${mono ? "mono text-sm" : "serif text-lg"} ${accent ? "text-accent" : "text-ink"} break-words`}
      >
        {value}
      </dd>
    </div>
  );
}
