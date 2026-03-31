"use client";

import type { ProductGallerySlide } from "@apparel-commerce/types";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { isDirectVideoUrl, youtubeEmbedUrl } from "@/lib/product-media";
import { ProductImageZoom } from "./ProductImageZoom";

function VideoSlide({ url, title }: { url: string; title: string }) {
  const yt = youtubeEmbedUrl(url);
  if (yt) {
    return (
      <div className="relative h-full min-h-[inherit] w-full bg-black">
        <iframe
          title={`${title} video`}
          src={yt}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  if (isDirectVideoUrl(url)) {
    return <video controls className="h-full w-full object-contain" src={url} />;
  }
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 bg-surface-container-high p-6 text-center">
      <p className="text-sm text-on-surface-variant">Open this video in a new tab.</p>
      <a
        href={url}
        className="font-medium text-primary underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open link
      </a>
    </div>
  );
}

export function ProductGalleryCarousel({
  slides,
  productName,
}: {
  slides: ProductGallerySlide[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const count = slides.length;
  const safe = count ? Math.min(active, count - 1) : 0;
  const slide = slides[safe];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!count) return;
      setActive((i) => (i + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (active >= count) setActive(0);
  }, [active, count]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const mainStageClass =
    count > 1
      ? "relative min-w-0 flex-1 overflow-hidden bg-surface-container-low"
      : "relative w-full min-w-0 self-start overflow-hidden bg-surface-container-low";

  if (!count) {
    return (
      <div className="relative h-[500px] w-full self-start bg-surface-container-high md:h-[716px]" />
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
      <div className={mainStageClass}>
        <div className="relative h-[500px] w-full md:h-[716px]">
          {slide?.kind === "image" ? (
            <ProductImageZoom
              src={slide.url}
              alt={productName}
              sizes="(max-width: 1024px) 100vw, (max-width: 1536px) 50vw, 46vw"
              priority={safe === 0}
            />
          ) : slide?.kind === "video" ? (
            <VideoSlide url={slide.url} title={productName} />
          ) : null}
        </div>
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/60"
              aria-label="Previous image or video"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden>
                chevron_left
              </span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/60"
              aria-label="Next image or video"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden>
                chevron_right
              </span>
            </button>
            <div
              className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5"
              role="tablist"
              aria-label="Gallery position"
            >
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === safe}
                  aria-label={`Slide ${i + 1} of ${count}`}
                  onClick={() => setActive(i)}
                  className={`h-2 w-2 rounded-full transition ${
                    i === safe ? "bg-white" : "bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <div
          className="flex gap-3 overflow-x-auto pb-1 md:max-h-[716px] md:w-28 md:flex-col md:overflow-y-auto md:pb-0"
          role="tablist"
          aria-label="Gallery thumbnails"
        >
          {slides.map((s, idx) => (
            <button
              key={`${s.kind}-${idx}-${s.url.slice(0, 40)}`}
              type="button"
              role="tab"
              aria-selected={idx === safe}
              aria-label={
                s.kind === "image" ? `Image ${idx + 1}` : `Video ${idx + 1}`
              }
              onClick={() => setActive(idx)}
              className={`relative h-24 w-20 shrink-0 overflow-hidden rounded-md border-2 bg-surface-container-highest transition ${
                idx === safe
                  ? "border-primary ring-1 ring-primary"
                  : "border-transparent opacity-90 hover:opacity-100"
              }`}
            >
              {s.kind === "image" ? (
                <Image
                  src={s.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-black px-1 text-center">
                  <span className="material-symbols-outlined text-lg text-white" aria-hidden>
                    play_circle
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-white/90">
                    Video
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
