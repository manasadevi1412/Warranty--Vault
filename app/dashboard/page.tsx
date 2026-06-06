"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiPhoneCall,
  FiTrash2,
  FiBell,
  FiBellOff,
  FiPlus,
  FiImage,
  FiSearch,
} from "react-icons/fi";
import {
  registerFcm,
  attachForegroundListener,
  checkPushSupport,
  currentPermission,
  type FcmStep,
} from "@/lib/firebase-client";
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

type Filter = "all" | "active" | "expiring" | "expired";

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [globalReminders, setGlobalReminders] = useState(true);
  const [pushState, setPushState] = useState<
    "loading" | "unsupported" | "blocked" | "idle" | "enabling" | "enabled"
  >("loading");
  const [pushBlockedReason, setPushBlockedReason] = useState<string | null>(null);
  const [enablingStep, setEnablingStep] = useState<FcmStep | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [lightbox, setLightbox] = useState<Warranty | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/dashboard");
  }, [status, router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/warranties");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server responded ${res.status}`);
      }
      const data = await res.json();
      setList(data.warranties || []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not reach the archive");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    refresh();
    fetch("/api/user/reminders")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setGlobalReminders(d.remindersEnabled ?? true))
      .catch(() => {});
    const unsubscribe = attachForegroundListener((p) => {
      toast(`${p.title ?? ""}\n${p.body ?? ""}`, { duration: 6000 });
    });
    return unsubscribe;
  }, [status, refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sup = await checkPushSupport();
      if (cancelled) return;
      if (!sup.supported && sup.reason) {
        setPushState("unsupported");
        setPushBlockedReason(sup.reason.message);
        return;
      }
      const perm = currentPermission();
      if (perm === "denied") {
        setPushState("blocked");
        setPushBlockedReason("Notifications are blocked. Click the lock icon in your address bar → Notifications → Allow, then reload.");
      } else if (perm === "granted") {
        setPushState("enabled");
      } else {
        setPushState("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stepLabels: Record<FcmStep, string> = {
    checking: "Checking browser support…",
    permission: "Asking for notification permission…",
    "service-worker": "Installing service worker…",
    token: "Generating push token…",
    saving: "Saving token to your account…",
    done: "Push reminders enabled.",
  };

  async function enablePush() {
    if (pushState === "enabling") return;
    setPushState("enabling");
    setEnablingStep("checking");
    const toastId = toast.loading(stepLabels.checking);
    const result = await registerFcm((step, label) => {
      setEnablingStep(step);
      toast.loading(label, { id: toastId });
    });
    if (result.ok) {
      toast.success("Push reminders enabled. You'll be reminded before warranties expire.", {
        id: toastId,
        duration: 4500,
      });
      setPushState("enabled");
      setEnablingStep(null);
      return;
    }
    setEnablingStep(null);
    if (result.code === "permission-denied") {
      setPushState("blocked");
      setPushBlockedReason(result.message);
    } else if (result.code === "unsupported" || result.code === "ios-needs-pwa" || result.code === "insecure-context") {
      setPushState("unsupported");
      setPushBlockedReason(result.message);
    } else {
      setPushState("idle");
    }
    toast.error(result.message, { id: toastId, duration: 6500 });
    if (result.cause) console.error("[registerFcm]", result.code, result.cause);
  }

  async function sendTestPush() {
    const res = await fetch("/api/dev/test-push", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Test push failed");
      return;
    }
    if (data.sent > 0) {
      toast.success(`Sent to ${data.sent}/${data.tokens} device(s). Background the tab to see it.`);
    } else {
      toast.error(`No devices received it. Errors: ${(data.errors || []).join(", ").slice(0, 120)}`);
    }
  }

  async function toggleGlobalReminders(next: boolean) {
    setGlobalReminders(next);
    await fetch("/api/user/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    toast.success(next ? "Reminders resumed" : "Reminders paused");
  }

  async function toggleItemReminder(id: string, next: boolean) {
    setList((l) => l.map((w) => (w._id === id ? { ...w, remindersEnabled: next } : w)));
    await fetch(`/api/warranties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindersEnabled: next }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Remove this entry from the archive?")) return;
    await fetch(`/api/warranties/${id}`, { method: "DELETE" });
    setList((l) => l.filter((w) => w._id !== id));
    toast.success("Entry removed");
  }

  const counts = useMemo(() => {
    const now = Date.now();
    let expiring = 0, expired = 0;
    for (const w of list) {
      const days = Math.ceil((new Date(w.expiryDate).getTime() - now) / 86_400_000);
      if (days < 0) expired++;
      else if (days <= 30) expiring++;
    }
    return { all: list.length, active: list.length - expired, expiring, expired };
  }, [list]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = query.trim().toLowerCase();
    return list
      .filter((w) => {
        const days = Math.ceil((new Date(w.expiryDate).getTime() - now) / 86_400_000);
        if (filter === "active" && days < 0) return false;
        if (filter === "expiring" && (days < 0 || days > 30)) return false;
        if (filter === "expired" && days >= 0) return false;
        if (!q) return true;
        return (
          w.companyName?.toLowerCase().includes(q) ||
          w.productName?.toLowerCase().includes(q) ||
          w.serialNumber?.toLowerCase().includes(q) ||
          w.notes?.toLowerCase().includes(q)
        );
      });
  }, [list, filter, query]);

  if (status !== "authenticated") return null;

  const today = new Date();
  const issue = `Vol. 01 · Issue ${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  return (
    <div className="max-w-[1100px] mx-auto px-5 sm:px-8">
      {/* Masthead */}
      <div className="pt-10 sm:pt-14 flex items-center justify-between gap-4">
        <div className="folio">{issue}</div>
        <div className="folio hidden sm:block">Archive · {counts.all} {counts.all === 1 ? "entry" : "entries"}</div>
      </div>
      <div className="rule-thick mt-3" />

      {/* Header section */}
      <section className="pt-10 sm:pt-14 grid lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7">
          <div className="eyebrow mb-4">Personal Archive</div>
          <h1 className="display text-[14vw] sm:text-[80px] leading-[0.95]">
            Your <span className="display-italic text-accent">warranties.</span>
          </h1>
          <p className="serif text-lg text-ink-2 mt-5 max-w-[40ch]">
            Every record you&apos;ve saved, sorted by what expires next.
          </p>
        </div>

        {/* CTA + ledger */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <Link href="/upload" className="btn btn-accent w-full sm:w-auto self-start">
            <FiPlus /> New entry
          </Link>

          <div className="grid grid-cols-3 gap-px bg-rule">
            <Ledger label="Active" value={counts.active} accent />
            <Ledger label="Expiring" value={counts.expiring} />
            <Ledger label="Expired" value={counts.expired} />
          </div>
        </div>
      </section>

      {/* Controls bar */}
      <div className="mt-12 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-rule">
        <div className="flex flex-wrap items-center gap-1">
          <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip label="Active" active={filter === "active"} onClick={() => setFilter("active")} />
          <FilterChip label="Expiring" active={filter === "expiring"} onClick={() => setFilter("expiring")} />
          <FilterChip label="Expired" active={filter === "expired"} onClick={() => setFilter("expired")} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none sm:w-72">
            <FiSearch
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brand, model, serial…"
              className="field w-full"
              style={{ paddingLeft: "40px" }}
            />
          </div>
        </div>
      </div>

      {/* Reminder controls */}
      <div className="mb-10 flex flex-col gap-3 text-sm text-ink-2">
        <div className="flex flex-wrap items-center gap-4">
          {pushState === "idle" && (
            <button onClick={enablePush} className="link inline-flex items-center gap-2">
              <FiBell /> Enable push reminders
            </button>
          )}
          {pushState === "enabling" && (
            <span className="inline-flex items-center gap-2 text-ink-2">
              <FiBell className="animate-pulse" />
              {enablingStep ? stepLabels[enablingStep] : "Enabling push reminders…"}
            </span>
          )}
          {pushState === "enabled" && (
            <span className="inline-flex items-center gap-2 text-olive">
              <FiBell /> Push reminders are <span className="mono">active</span>
            </span>
          )}
          {pushState === "blocked" && (
            <button onClick={enablePush} className="link inline-flex items-center gap-2 text-oxblood">
              <FiBellOff /> Notifications blocked — fix &amp; retry
            </button>
          )}
          {pushState === "unsupported" && (
            <span className="inline-flex items-center gap-2 text-ink-3">
              <FiBellOff /> Push not supported here
            </span>
          )}
          <button
            onClick={() => toggleGlobalReminders(!globalReminders)}
            className="inline-flex items-center gap-2 hover:text-ink transition-colors"
          >
            {globalReminders ? <FiBell /> : <FiBellOff />}
            Reminders are <span className="mono">{globalReminders ? "on" : "off"}</span>
          </button>
          {process.env.NODE_ENV !== "production" && pushState === "enabled" && (
            <button onClick={sendTestPush} className="link inline-flex items-center gap-2">
              <FiBell /> Send test push
            </button>
          )}
        </div>
        {(pushState === "blocked" || pushState === "unsupported") && pushBlockedReason && (
          <p className="text-xs text-ink-3 max-w-[70ch]">{pushBlockedReason}</p>
        )}
      </div>

      {/* Entries */}
      {loading ? (
        <SkeletonGrid />
      ) : loadError ? (
        <LoadError message={loadError} onRetry={refresh} />
      ) : list.length === 0 ? (
        <Empty />
      ) : filtered.length === 0 ? (
        <NoResults />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule mb-20 border-y border-rule">
          {filtered.map((w, i) => (
            <Entry
              key={w._id}
              w={w}
              index={i + 1}
              onCall={() => (window.location.href = `tel:${w.companyPhone}`)}
              onToggle={(next) => toggleItemReminder(w._id, next)}
              onDelete={() => remove(w._id)}
              onView={() => setLightbox(w)}
            />
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox
          src={lightbox.imageUrl || lightbox.imageData || ""}
          alt={`${lightbox.companyName} warranty card`}
          caption={`${lightbox.companyName} · ${lightbox.productName}`}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function Ledger({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-paper-2 px-4 py-4">
      <div className="eyebrow-sm">{label}</div>
      <div
        className={`display text-3xl sm:text-4xl mt-1 ${accent ? "text-accent" : ""}`}
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
      >
        {value}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 eyebrow transition-colors ${
        active ? "text-accent" : "text-ink-3 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function Entry({
  w,
  index,
  onCall,
  onToggle,
  onDelete,
  onView,
}: {
  w: Warranty;
  index: number;
  onCall: () => void;
  onToggle: (next: boolean) => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const [now] = useState(() => Date.now());
  const expiryDate = new Date(w.expiryDate);
  const days = Math.ceil((expiryDate.getTime() - now) / 86_400_000);
  const expired = days < 0;
  const soon = !expired && days <= 30;
  const img = w.imageUrl || w.imageData;

  return (
    <article className="bg-paper-2 p-6 sm:p-7 flex flex-col gap-5">
      {/* Folio + status */}
      <div className="flex items-center justify-between">
        <span className="folio">№ {String(index).padStart(3, "0")}</span>
        <Status expired={expired} soon={soon} days={days} />
      </div>

      {/* Title block */}
      <div className="flex gap-5">
        {img ? (
          <button
            onClick={onView}
            className="shrink-0 w-20 h-24 sm:w-24 sm:h-28 border border-rule overflow-hidden bg-paper-3 group relative"
            title="View card image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/0 group-hover:bg-ink/40 transition-colors">
              <FiImage className="text-paper-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          </button>
        ) : (
          <div className="shrink-0 w-20 h-24 sm:w-24 sm:h-28 border border-dashed border-rule-2 flex items-center justify-center text-ink-3">
            <FiImage />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="eyebrow-sm mb-1">{w.companyName || "Unknown brand"}</div>
          <h2
            className="display text-2xl sm:text-[28px] leading-[1.05] truncate"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
          >
            {w.productName || "Untitled product"}
          </h2>
          {w.serialNumber && (
            <div className="mono text-xs text-ink-3 mt-2 truncate">SN · {w.serialNumber}</div>
          )}
        </div>
      </div>

      {/* Date row */}
      <div className="rule-dashed pt-4 flex items-baseline justify-between">
        <div>
          <div className="eyebrow-sm">Expires</div>
          <div className="mono text-base mt-0.5 text-ink">
            {expiryDate.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow-sm">{expired ? "Lapsed" : "Remaining"}</div>
          <div className={`mono text-base mt-0.5 ${expired ? "text-oxblood" : soon ? "text-ochre" : "text-olive"}`}>
            {expired ? `${Math.abs(days)}d ago` : `${days}d`}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rule-thin pt-4 flex items-center justify-between gap-2">
        <button
          onClick={onCall}
          disabled={!w.companyPhone}
          className="eyebrow inline-flex items-center gap-2 text-ink hover:text-accent transition-colors disabled:text-ink-3 disabled:hover:text-ink-3"
          title={w.companyPhone || "No phone number"}
        >
          <FiPhoneCall /> Call brand
        </button>
        <div className="flex items-center gap-1">
          <Link
            href={`/warranty/${w._id}`}
            className="eyebrow text-ink-2 hover:text-ink px-2 py-2 transition-colors"
          >
            Open ↗
          </Link>
          <button
            onClick={() => onToggle(!w.remindersEnabled)}
            className={`p-2 transition-colors ${w.remindersEnabled ? "text-ink hover:text-accent" : "text-ink-3 hover:text-ink"}`}
            title={w.remindersEnabled ? "Reminders on" : "Reminders off"}
          >
            {w.remindersEnabled ? <FiBell /> : <FiBellOff />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-ink-3 hover:text-oxblood transition-colors"
            title="Remove"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>
    </article>
  );
}

function Status({ expired, soon, days }: { expired: boolean; soon: boolean; days: number }) {
  if (expired) {
    return <span className="tag text-oxblood">Lapsed</span>;
  }
  if (soon) {
    return <span className="tag text-ochre">Expiring · {days}d</span>;
  }
  return <span className="tag text-olive">In force</span>;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule mb-20 border-y border-rule">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-paper-2 p-6 sm:p-7 flex flex-col gap-5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-14 bg-rule" />
            <div className="h-5 w-20 bg-rule rounded-full" />
          </div>
          <div className="flex gap-5">
            <div className="shrink-0 w-20 h-24 sm:w-24 sm:h-28 bg-paper-3 border border-rule" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-3 w-24 bg-rule" />
              <div className="h-7 w-3/4 bg-rule" />
              <div className="h-3 w-1/2 bg-rule mt-3" />
            </div>
          </div>
          <div className="rule-dashed pt-4 flex items-baseline justify-between">
            <div className="space-y-2">
              <div className="h-3 w-14 bg-rule" />
              <div className="h-4 w-28 bg-rule" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-3 w-14 bg-rule ml-auto" />
              <div className="h-4 w-16 bg-rule ml-auto" />
            </div>
          </div>
          <div className="rule-thin pt-4 flex items-center justify-between">
            <div className="h-3 w-20 bg-rule" />
            <div className="h-3 w-24 bg-rule" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="my-12 py-12 sm:py-16 px-6 border-y border-rule">
      <div className="max-w-[560px] mx-auto text-center">
        <div className="eyebrow text-accent">Connection error</div>
        <h2 className="display text-4xl sm:text-5xl mt-4">
          The archive is <span className="display-italic text-accent">unreachable.</span>
        </h2>
        <p className="serif text-base text-ink-2 mt-5">
          We couldn&apos;t reach the database. This is almost always one of:
        </p>
        <ul className="text-left mt-4 max-w-[440px] mx-auto space-y-2 serif text-sm text-ink-2">
          <li>· The MongoDB Atlas cluster is paused or asleep — open Atlas and resume it.</li>
          <li>· Your current IP isn&apos;t in the cluster&apos;s Network Access allowlist.</li>
          <li>· Atlas is patching the cluster (transient — wait a minute and retry).</li>
        </ul>
        <p className="folio mt-6 text-ink-3 break-words px-4">
          {message}
        </p>
        <button onClick={onRetry} className="btn btn-ink mt-8 inline-flex">
          Retry
        </button>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="my-16 py-16 sm:py-20 px-6 border-y border-rule text-center">
      <div className="eyebrow">First Entry</div>
      <h2 className="display text-5xl sm:text-6xl mt-4">
        The archive is <span className="display-italic text-accent">empty.</span>
      </h2>
      <p className="serif text-base text-ink-2 mt-6 max-w-[44ch] mx-auto">
        Add your first warranty card to begin. Snap a photo, review the
        details, and we&apos;ll remind you before it expires.
      </p>
      <Link href="/upload" className="btn btn-ink mt-8 inline-flex">
        <FiPlus /> Add the first entry
      </Link>
    </div>
  );
}

function NoResults() {
  return (
    <div className="my-16 py-16 text-center">
      <div className="eyebrow">No matches</div>
      <p className="serif text-lg text-ink-2 mt-4">Nothing in the archive fits this view.</p>
    </div>
  );
}
