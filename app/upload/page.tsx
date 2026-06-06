"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiUploadCloud,
  FiLoader,
  FiSave,
  FiRefreshCw,
  FiCamera,
  FiImage,
} from "react-icons/fi";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

type Parsed = {
  productName: string;
  companyName: string;
  companyPhone: string;
  serialNumber: string;
  purchaseDate: string | null;
  expiryDate: string | null;
};

export default function UploadPage() {
  const { status } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState<"idle" | "analyzing" | "uploading" | "saving">("idle");
  const [uploaded, setUploaded] = useState<{ key: string; url: string } | null>(null);
  const [parsed, setParsed] = useState<Parsed>({
    productName: "",
    companyName: "",
    companyPhone: "",
    serialNumber: "",
    purchaseDate: null,
    expiryDate: null,
  });
  const [notes, setNotes] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/upload");
  }, [status, router]);

  function acceptFile(f: File): boolean {
    if (f.size > MAX_BYTES) {
      toast.error(`File is too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)}MB.`);
      return false;
    }
    const typeOk =
      ACCEPTED_TYPES.includes(f.type) ||
      // HEIC sometimes reports an empty MIME type — fall back to extension
      (f.type === "" && /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (!typeOk) {
      toast.error("That format isn't supported. Use JPG, PNG, WEBP, or HEIC.");
      return false;
    }
    return true;
  }

  function handleFile(f: File) {
    if (!acceptFile(f)) return;
    setFile(f);
    setUploaded(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ""));
    reader.readAsDataURL(f);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) handleFile(f);
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types?.includes("Files")) {
      dragDepth.current += 1;
      setIsDragging(true);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (!dt) return;
    const f = dt.files?.[0];
    if (f) handleFile(f);
  }

  function clearFile() {
    setFile(null);
    setPreview("");
    setUploaded(null);
    setParsed({
      productName: "",
      companyName: "",
      companyPhone: "",
      serialNumber: "",
      purchaseDate: null,
      expiryDate: null,
    });
  }

  async function analyze() {
    if (!file) {
      toast.error("Choose an image first");
      return;
    }
    setBusy("analyzing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }
      const data = await res.json();
      setParsed(data.parsed);
      toast.success("Details extracted. Review and save.");
    } catch (e) {
      console.error(e);
      toast.error("Could not analyse the image. Try a clearer photo.");
    } finally {
      setBusy("idle");
    }
  }

  async function uploadDoc() {
    if (!file) return null;
    if (uploaded) return uploaded;
    setBusy("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 503) {
          toast("Cloud storage unavailable — saving without document.", { icon: "⚠️" });
          return null;
        }
        throw new Error(err.error || "upload failed");
      }
      const data = (await res.json()) as { key: string; url: string };
      setUploaded(data);
      return data;
    } catch (e) {
      console.error(e);
      toast.error("Could not upload document");
      return null;
    } finally {
      setBusy("idle");
    }
  }

  async function save() {
    if (!parsed.expiryDate) {
      toast.error("Expiry date is required");
      return;
    }
    const uploadResult = await uploadDoc();
    setBusy("saving");
    try {
      const res = await fetch("/api/warranties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed,
          notes,
          imageUrl: uploadResult?.url || "",
          imageKey: uploadResult?.key || "",
          imageData: uploadResult ? "" : preview,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("Entry filed");
      router.push("/dashboard");
    } catch {
      toast.error("Could not save");
    } finally {
      setBusy("idle");
    }
  }

  if (status !== "authenticated") return null;

  const formReady = parsed.expiryDate && busy === "idle";

  return (
    <div className="max-w-[1100px] mx-auto px-5 sm:px-8">
      {/* Masthead */}
      <div className="pt-10 sm:pt-14 flex items-center justify-between gap-4">
        <div className="folio">New entry</div>
        <div className="folio hidden sm:block">A snap, a review, a file.</div>
      </div>
      <div className="rule-thick mt-3" />

      <section className="pt-10 sm:pt-12">
        <div className="eyebrow mb-4">Filing №</div>
        <h1 className="display text-[12vw] sm:text-[72px] leading-[0.95]">
          Add to the <span className="display-italic text-accent">archive.</span>
        </h1>
        <p className="serif text-lg text-ink-2 mt-5 max-w-[50ch]">
          Upload a photo of the warranty card. We&apos;ll read it, fill the form,
          and you can adjust anything before filing it.
        </p>
      </section>

      <div className="grid lg:grid-cols-12 gap-10 mt-12 mb-20">
        {/* Left: image area */}
        <section className="lg:col-span-5">
          <div className="eyebrow mb-3">I · The card</div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`block border ${
              isDragging
                ? "border-accent border-solid bg-accent-soft"
                : preview
                ? "border-rule"
                : "border-dashed border-rule-2 hover:border-ink-3"
            } bg-paper-2 transition-colors cursor-pointer aspect-[4/5] sm:aspect-[3/4] overflow-hidden`}
            aria-label="Upload warranty card image"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFileChange}
              className="hidden"
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="card preview" className="w-full h-full object-contain pointer-events-none" />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-ink-3 p-8 text-center pointer-events-none">
                <FiUploadCloud className={`text-5xl mb-4 ${isDragging ? "text-accent" : ""}`} />
                <div className={`serif text-lg ${isDragging ? "text-accent" : "text-ink-2"}`}>
                  {isDragging ? "Drop to upload" : "Drag a photo here"}
                </div>
                <div className="folio mt-2">or use the buttons below</div>
                <div className="folio mt-4 text-ink-3">JPG · PNG · WEBP · HEIC · ≤ 8MB</div>
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="btn btn-ghost"
            >
              <FiImage /> Choose
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="btn btn-ghost"
            >
              <FiCamera /> Snap
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={analyze}
              disabled={!file || busy !== "idle"}
              className="btn btn-ink flex-1 sm:flex-none"
            >
              {busy === "analyzing" ? (
                <>
                  <FiLoader className="animate-spin" /> Analysing…
                </>
              ) : (
                <>Analyse</>
              )}
            </button>
            {file && (
              <button onClick={clearFile} className="btn btn-ghost">
                <FiRefreshCw /> Replace
              </button>
            )}
          </div>
        </section>

        {/* Right: form */}
        <section className="lg:col-span-7 lg:pl-10 lg:border-l lg:border-rule">
          <div className="eyebrow mb-3">II · The details</div>

          <div className="grid gap-5">
            <Field label="Brand" hint="Manufacturer or company">
              <input
                className="field"
                value={parsed.companyName}
                onChange={(e) => setParsed({ ...parsed, companyName: e.target.value })}
                placeholder="e.g. Faber"
              />
            </Field>
            <Field label="Product · Model" hint="Exact model name or SKU">
              <input
                className="field"
                value={parsed.productName}
                onChange={(e) => setParsed({ ...parsed, productName: e.target.value })}
                placeholder="e.g. Hood Mojito IN HC SC FL BK 60"
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Support phone">
                <input
                  className="field mono"
                  value={parsed.companyPhone}
                  onChange={(e) => setParsed({ ...parsed, companyPhone: e.target.value })}
                  placeholder="1800-XXX-XXXX"
                />
              </Field>
              <Field label="Serial number">
                <input
                  className="field mono"
                  value={parsed.serialNumber}
                  onChange={(e) => setParsed({ ...parsed, serialNumber: e.target.value })}
                  placeholder="NH26D0054914"
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Purchased on">
                <input
                  type="date"
                  className="field mono"
                  value={parsed.purchaseDate ?? ""}
                  onChange={(e) => setParsed({ ...parsed, purchaseDate: e.target.value || null })}
                />
              </Field>
              <Field label="Expires on" required>
                <input
                  type="date"
                  className="field mono"
                  value={parsed.expiryDate ?? ""}
                  onChange={(e) => setParsed({ ...parsed, expiryDate: e.target.value || null })}
                />
              </Field>
            </div>

            <Field label="Marginalia" hint="Optional notes for future you">
              <textarea
                className="field resize-none"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bought at Croma · Originally ₹38,000"
              />
            </Field>
          </div>

          <div className="rule-thin mt-8 pt-6 flex items-center justify-between gap-4">
            <p className="folio">
              {parsed.expiryDate
                ? `Will be filed under ${new Date(parsed.expiryDate).getFullYear()}`
                : "Set an expiry date to file the entry"}
            </p>
            <button onClick={save} disabled={!formReady} className="btn btn-accent">
              {busy === "saving" || busy === "uploading" ? (
                <>
                  <FiLoader className="animate-spin" />
                  {busy === "uploading" ? "Uploading…" : "Filing…"}
                </>
              ) : (
                <>
                  <FiSave /> File entry
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="eyebrow-sm">
          {label}
          {required && <span className="text-accent ml-1">*</span>}
        </span>
        {hint && <span className="folio text-ink-3">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
