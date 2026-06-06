"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";

export default function Lightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt?: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 sm:px-10 sm:py-12"
      style={{ background: "rgba(20, 17, 13, 0.94)" }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 inline-flex items-center justify-center text-paper-2 hover:text-accent-2 transition-colors z-10"
        aria-label="Close"
      >
        <FiX size={22} />
      </button>

      <figure
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full flex flex-col items-center gap-4"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || ""}
          className="max-w-full max-h-[80vh] object-contain"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
        />
        {caption && (
          <figcaption className="folio text-paper-2/70 text-center">{caption}</figcaption>
        )}
      </figure>
    </div>
  );
}
