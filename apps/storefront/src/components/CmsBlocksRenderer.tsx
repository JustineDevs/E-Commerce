import Image from "next/image";
import Link from "next/link";
import type { CmsBlock } from "@apparel-commerce/platform-data";

export function CmsBlocksRenderer({ blocks }: { blocks: CmsBlock[] }) {
  if (!blocks.length) return null;
  return (
    <div className="mt-10 space-y-10">
      {blocks.map((b) => {
        switch (b.type) {
          case "hero": {
            const title = String(b.props.title ?? "");
            const subtitle = String(b.props.subtitle ?? "");
            const imageUrl = typeof b.props.imageUrl === "string" ? b.props.imageUrl : "";
            const href = typeof b.props.href === "string" ? b.props.href : "";
            const cta = String(b.props.ctaLabel ?? "Learn more");
            return (
              <section
                key={b.id}
                className="relative overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low"
              >
                {imageUrl ? (
                  <div className="relative aspect-[21/9] w-full">
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 1200px) 100vw, 1200px"
                    />
                  </div>
                ) : null}
                <div className="p-8 sm:p-10">
                  {title ? (
                    <h2 className="font-headline text-2xl font-bold text-primary sm:text-3xl">
                      {title}
                    </h2>
                  ) : null}
                  {subtitle ? (
                    <p className="mt-3 font-body text-sm leading-relaxed text-on-surface-variant">
                      {subtitle}
                    </p>
                  ) : null}
                  {href ? (
                    <Link
                      href={href}
                      className="mt-6 inline-flex rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
                    >
                      {cta}
                    </Link>
                  ) : null}
                </div>
              </section>
            );
          }
          case "rich_text": {
            const html = String(b.props.html ?? "");
            if (!html.trim()) return null;
            return (
              <div
                key={b.id}
                className="prose prose-sm max-w-none font-body text-on-surface-variant"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }
          case "image": {
            const src = String(b.props.src ?? "");
            const alt = String(b.props.alt ?? "");
            if (!src) return null;
            return (
              <figure key={b.id} className="overflow-hidden rounded-xl">
                <div className="relative aspect-video w-full">
                  <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 960px) 100vw, 960px" />
                </div>
                {alt ? (
                  <figcaption className="mt-2 text-xs text-on-surface-variant">{alt}</figcaption>
                ) : null}
              </figure>
            );
          }
          case "cta_row": {
            const label = String(b.props.label ?? "");
            const href = String(b.props.href ?? "");
            if (!href) return null;
            return (
              <div key={b.id} className="flex justify-center">
                <Link
                  href={href}
                  className="inline-flex rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  {label || "Continue"}
                </Link>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
