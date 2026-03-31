import Image from "next/image";
import Link from "next/link";
import type { CmsBlock } from "@apparel-commerce/platform-data";
import { CatalogProductCard } from "@/components/CatalogProductCard";
import { getCachedProductBySlug } from "@/lib/cached-product";
import { isDirectVideoUrl, youtubeEmbedUrl } from "@/lib/product-media";

type FaqItem = { q: string; a: string };

function parseFaqItems(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FaqItem[] = [];
  for (const x of raw) {
    if (x && typeof x === "object" && "q" in x && "a" in x) {
      const r = x as Record<string, unknown>;
      out.push({
        q: String(r.q ?? ""),
        a: String(r.a ?? ""),
      });
    }
  }
  return out.filter((i) => i.q.trim() || i.a.trim());
}

export async function CmsBlocksRenderer({ blocks }: { blocks: CmsBlock[] }) {
  if (!blocks.length) return null;
  const nodes: React.ReactNode[] = [];

  for (const b of blocks) {
    switch (b.type) {
      case "hero": {
        const title = String(b.props.title ?? "");
        const subtitle = String(b.props.subtitle ?? "");
        const imageUrl = typeof b.props.imageUrl === "string" ? b.props.imageUrl : "";
        const href = typeof b.props.href === "string" ? b.props.href : "";
        const cta = String(b.props.ctaLabel ?? "Learn more");
        nodes.push(
          <section
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="hero"
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
          </section>,
        );
        break;
      }
      case "rich_text": {
        const html = String(b.props.html ?? "");
        if (!html.trim()) break;
        nodes.push(
          <div
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="rich_text"
            className="prose prose-sm max-w-none font-body text-on-surface-variant"
            dangerouslySetInnerHTML={{ __html: html }}
          />,
        );
        break;
      }
      case "image": {
        const src = String(b.props.src ?? "");
        const alt = String(b.props.alt ?? "");
        if (!src) break;
        nodes.push(
          <figure
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="image"
            className="overflow-hidden rounded-xl"
          >
            <div className="relative aspect-video w-full">
              <Image
                src={src}
                alt={alt}
                fill
                className="object-cover"
                sizes="(max-width: 960px) 100vw, 960px"
              />
            </div>
            {alt ? (
              <figcaption className="mt-2 text-xs text-on-surface-variant">{alt}</figcaption>
            ) : null}
          </figure>,
        );
        break;
      }
      case "cta_row": {
        const label = String(b.props.label ?? "");
        const href = String(b.props.href ?? "");
        if (!href) break;
        nodes.push(
          <div
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="cta_row"
            className="flex justify-center"
          >
            <Link
              href={href}
              className="inline-flex rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              {label || "Continue"}
            </Link>
          </div>,
        );
        break;
      }
      case "divider": {
        const h = String(b.props.heightPx ?? "24");
        nodes.push(
          <div
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="divider"
            className="w-full border-t border-outline-variant/20"
            style={{ marginTop: `${h}px`, marginBottom: `${h}px` }}
            aria-hidden
          />,
        );
        break;
      }
      case "two_column": {
        const html = String(b.props.html ?? "");
        const imageUrl = String(b.props.imageUrl ?? "");
        const imageAlt = String(b.props.imageAlt ?? "");
        const reverse = Boolean(b.props.reverse);
        nodes.push(
          <section
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="two_column"
            className={`grid gap-8 md:grid-cols-2 md:items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
          >
            {imageUrl ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-container-low">
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ) : null}
            {html.trim() ? (
              <div
                className="prose prose-sm max-w-none font-body text-on-surface-variant"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : null}
          </section>,
        );
        break;
      }
      case "faq": {
        const items = parseFaqItems(b.props.items);
        if (!items.length) break;
        nodes.push(
          <section
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="faq"
            className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 p-6"
          >
            {items.map((item, i) => (
              <details key={i} className="group border-b border-outline-variant/15 pb-3 last:border-0">
                <summary className="cursor-pointer list-none font-semibold text-primary">
                  {item.q}
                  <span className="material-symbols-outlined float-right text-on-surface-variant transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <div
                  className="mt-2 text-sm leading-relaxed text-on-surface-variant"
                  dangerouslySetInnerHTML={{ __html: item.a }}
                />
              </details>
            ))}
          </section>,
        );
        break;
      }
      case "video": {
        const url = String(b.props.url ?? "");
        const title = String(b.props.title ?? "Video");
        const yt = youtubeEmbedUrl(url);
        if (yt) {
          nodes.push(
            <div
              key={b.id}
              data-cms-block-id={b.id}
              data-cms-block-type="video"
              className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
            >
              <iframe
                title={title}
                src={yt}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>,
          );
        } else if (isDirectVideoUrl(url)) {
          nodes.push(
            <video
              key={b.id}
              data-cms-block-id={b.id}
              data-cms-block-type="video"
              controls
              className="w-full rounded-xl"
              src={url}
            >
              <track kind="captions" />
            </video>,
          );
        }
        break;
      }
      case "trust_strip": {
        const col1t = String(b.props.col1Title ?? "Secure checkout");
        const col1b = String(b.props.col1Body ?? "");
        const col2t = String(b.props.col2Title ?? "Shipping");
        const col2b = String(b.props.col2Body ?? "");
        const col3t = String(b.props.col3Title ?? "Returns");
        const col3b = String(b.props.col3Body ?? "");
        nodes.push(
          <div
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="trust_strip"
            className="grid gap-6 rounded-xl border border-outline-variant/20 bg-surface-container-low/30 p-6 sm:grid-cols-3"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{col1t}</p>
              <p className="mt-2 text-sm text-on-surface-variant">{col1b}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{col2t}</p>
              <p className="mt-2 text-sm text-on-surface-variant">{col2b}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{col3t}</p>
              <p className="mt-2 text-sm text-on-surface-variant">{col3b}</p>
            </div>
          </div>,
        );
        break;
      }
      case "contact_strip": {
        const phone = String(b.props.phone ?? "");
        const email = String(b.props.email ?? "");
        const hours = String(b.props.hours ?? "");
        nodes.push(
          <div
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="contact_strip"
            className="rounded-xl border border-outline-variant/20 bg-surface-container-low/30 p-6 text-sm text-on-surface-variant"
          >
            {phone ? (
              <p>
                <strong className="text-primary">Phone:</strong> {phone}
              </p>
            ) : null}
            {email ? (
              <p className="mt-2">
                <strong className="text-primary">Email:</strong>{" "}
                <a href={`mailto:${email}`} className="underline">
                  {email}
                </a>
              </p>
            ) : null}
            {hours ? <p className="mt-2">{hours}</p> : null}
          </div>,
        );
        break;
      }
      case "newsletter": {
        const heading = String(b.props.heading ?? "Newsletter");
        const sub = String(b.props.subtitle ?? "");
        const actionUrl = String(b.props.actionUrl ?? "");
        nodes.push(
          <section
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="newsletter"
            className="rounded-xl border border-outline-variant/20 bg-surface-container-low/40 p-8"
          >
            <h2 className="font-headline text-xl font-bold text-primary">{heading}</h2>
            {sub ? <p className="mt-2 text-sm text-on-surface-variant">{sub}</p> : null}
            {actionUrl ? (
              <form method="get" action={actionUrl} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor={`nl-${b.id}`}>
                  Email
                </label>
                <input
                  id={`nl-${b.id}`}
                  name="email"
                  type="email"
                  required
                  placeholder="Email address"
                  className="flex-1 rounded-lg border border-outline-variant/30 px-4 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white"
                >
                  Subscribe
                </button>
              </form>
            ) : (
              <p className="mt-4 text-xs text-on-surface-variant">
                Set the form action URL in the CMS block to enable signup.
              </p>
            )}
          </section>,
        );
        break;
      }
      case "featured_products": {
        const raw = String(b.props.slugs ?? "");
        const slugs = raw
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 8);
        const products = [];
        for (const slug of slugs) {
          const res = await getCachedProductBySlug(slug);
          if (res.kind === "ok") products.push(res.product);
        }
        if (!products.length) break;
        nodes.push(
          <section
            key={b.id}
            data-cms-block-id={b.id}
            data-cms-block-type="featured_products"
            className="space-y-6"
          >
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <CatalogProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>,
        );
        break;
      }
      default:
        break;
    }
  }

  if (!nodes.length) return null;
  return <div className="mt-10 space-y-10">{nodes}</div>;
}
