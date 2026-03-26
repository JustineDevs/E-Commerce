"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function ProductImageZoom({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block h-full min-h-[inherit] w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`View larger: ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 hover:scale-105"
        />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged product image"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 max-h-[min(92vh,1200px)] max-w-[min(96vw,900px)]">
            <Image
              src={src}
              alt={alt}
              width={1200}
              height={1600}
              className="max-h-[min(92vh,1200px)] w-auto object-contain"
              sizes="96vw"
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-20 rounded border border-white/40 bg-black/50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>
      ) : null}
    </>
  );
}
