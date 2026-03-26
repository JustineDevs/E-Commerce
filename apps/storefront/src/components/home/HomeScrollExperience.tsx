"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@apparel-commerce/ui";
import { CatalogProductCard } from "@/components/CatalogProductCard";
import type { Product } from "@apparel-commerce/types";
import type { StorefrontHomePayload } from "@apparel-commerce/platform-data";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, useRef } from "react";
import { batchScrollRevealChildren } from "@/lib/gsap-scroll-system";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  products: Product[];
  home: StorefrontHomePayload;
};

function TileMedia({
  imageUrl,
  fallbackClass,
}: {
  imageUrl: string;
  fallbackClass: string;
}) {
  const trimmed = imageUrl?.trim();
  if (trimmed) {
    return (
      <div className="relative h-full min-h-[inherit] w-full">
        <Image
          src={trimmed}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 66vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
    );
  }
  return (
    <div
      className={`h-full min-h-[inherit] w-full transition-transform duration-700 group-hover:scale-105 ${fallbackClass}`}
    />
  );
}

/**
 * Maharlika home with Infiner-style motion: hero stagger + scroll reveals,
 * driven by GSAP ScrollTrigger. Copy and images come from admin CMS (Supabase).
 */
export function HomeScrollExperience({ products, home }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);
  const collectionsRef = useRef<HTMLElement>(null);
  const latestHeaderRef = useRef<HTMLDivElement>(null);
  const productsGridRef = useRef<HTMLDivElement>(null);
  const clubRef = useRef<HTMLElement>(null);

  const [t0, t1, t2] = home.tiles;

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ease = "power3.out";
    const ctx = gsap.context(() => {
      const heroTl = gsap.timeline({ defaults: { duration: 0.8, ease } });
      if (line1Ref.current) {
        heroTl.from(line1Ref.current, {
          x: 100,
          opacity: 0,
          duration: 0.8,
          ease,
        });
      }
      if (line2Ref.current) {
        heroTl.from(
          line2Ref.current,
          { y: 30, opacity: 0, duration: 0.8, ease },
          "-=0.5",
        );
      }
      if (leadRef.current) {
        heroTl.from(
          leadRef.current,
          { y: 30, opacity: 0, duration: 0.8, ease },
          "-=0.55",
        );
      }
      if (ctaRef.current) {
        heroTl.from(
          ctaRef.current,
          { y: 30, opacity: 0, duration: 0.8, ease },
          "-=0.55",
        );
      }
      if (asideRef.current) {
        heroTl.from(
          asideRef.current,
          { opacity: 0, scale: 1.04, duration: 1, ease: "power2.out" },
          "-=0.9",
        );
      }

      const panels = collectionsRef.current?.querySelectorAll<HTMLElement>(
        "[data-home-collection-panel]",
      );
      if (panels?.length) {
        panels.forEach((panel, index) => {
          const fromX = index % 2 === 0 ? -70 : 70;
          gsap.from(panel, {
            scrollTrigger: {
              trigger: panel,
              start: "top 88%",
              toggleActions: "play none none none",
            },
            x: fromX,
            opacity: 0,
            duration: 0.85,
            ease,
          });
        });
      }

      if (latestHeaderRef.current) {
        gsap.from(latestHeaderRef.current.children, {
          scrollTrigger: {
            trigger: latestHeaderRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
          y: 36,
          opacity: 0,
          duration: 0.75,
          stagger: 0.12,
          ease,
        });
      }

      batchScrollRevealChildren(
        gsap,
        ScrollTrigger,
        productsGridRef.current,
        "[data-home-product]",
        {
          ease,
          y: 50,
          duration: 0.72,
          stagger: 0.12,
          start: "top 82%",
        },
      );

      if (clubRef.current) {
        gsap.from(clubRef.current.children, {
          scrollTrigger: {
            trigger: clubRef.current,
            start: "top 85%",
            toggleActions: "play none none none",
          },
          y: 32,
          opacity: 0,
          duration: 0.75,
          stagger: 0.15,
          ease,
        });
      }
    }, rootRef);

    return () => {
      ctx.revert();
    };
  }, [products.length, home.hero.line1]);

  const heroImage = home.hero.imageUrl?.trim();

  return (
    <div ref={rootRef}>
      <section className="relative flex min-h-[clamp(22rem,72svh,40rem)] w-full items-center overflow-hidden bg-surface-container-low storefront-section-x py-10 sm:py-14 md:py-16 lg:py-20">
        <div className="relative z-10 mx-auto w-full max-w-[1600px]">
          <h1 className="mb-6 max-w-[min(100%,42rem)] font-headline text-[clamp(2rem,7.5vw,4.75rem)] font-extrabold leading-[1.02] tracking-tighter text-primary sm:mb-8 md:text-[clamp(2.25rem,6.5vw,4.5rem)] lg:max-w-[48rem]">
            <span ref={line1Ref} className="block">
              {home.hero.line1}
            </span>
            <span
              ref={line2Ref}
              className="block text-[clamp(1.2rem,4.2vw,2.75rem)] font-bold tracking-tight text-primary"
            >
              {home.hero.line2}
            </span>
          </h1>
          <p
            ref={leadRef}
            className="mb-8 max-w-md font-body text-base leading-relaxed text-on-surface-variant sm:mb-10 sm:text-lg"
          >
            {home.hero.lead}{" "}
            {home.hero.showPrivacyLink ? (
              <Link
                href="/privacy"
                className="font-medium text-primary underline underline-offset-4 hover:no-underline"
              >
                Privacy policy
              </Link>
            ) : null}
          </p>
          <Button
            asChild
            className="bg-gradient-to-br from-primary to-primary-container px-8 py-3.5 font-medium sm:px-10 sm:py-4"
          >
            <Link ref={ctaRef} href={home.hero.ctaHref || "/shop"}>
              {home.hero.ctaLabel}
            </Link>
          </Button>
        </div>
        <div
          ref={asideRef}
          className="pointer-events-none absolute right-0 top-0 h-full w-full opacity-35 md:w-1/2 md:opacity-100"
        >
          {heroImage ? (
            <div className="relative h-full w-full">
              <Image
                src={heroImage}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-full w-full bg-surface-container-high" aria-hidden />
          )}
        </div>
      </section>

      <section
        ref={collectionsRef}
        className="bg-surface py-14 sm:py-16 md:py-24 storefront-section-x"
      >
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 md:h-[min(36rem,70vh)] md:grid-cols-12">
          <Link
            data-home-collection-panel
            href={t0.href}
            className="group relative min-h-[14rem] overflow-hidden rounded-lg bg-surface-container-low md:col-span-8 md:min-h-0"
          >
            <TileMedia
              imageUrl={t0.imageUrl}
              fallbackClass="bg-surface-container-high"
            />
            <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 md:bottom-10 md:left-10">
              <h3
                className={
                  t0.variant === "large"
                    ? "font-headline text-3xl font-extrabold text-white mix-blend-difference sm:text-4xl"
                    : "font-headline text-2xl font-extrabold text-primary sm:text-3xl"
                }
              >
                {t0.title}
              </h3>
              {t0.linkLabel ? (
                <span
                  className={
                    t0.variant === "large"
                      ? "mt-2 inline-block font-medium text-white underline underline-offset-8 mix-blend-difference"
                      : "mt-2 inline-block font-medium text-primary transition-all hover:underline hover:underline-offset-8"
                  }
                >
                  {t0.linkLabel}
                </span>
              ) : null}
            </div>
          </Link>
          <Link
            data-home-collection-panel
            href={t1.href}
            className="group relative min-h-[12rem] overflow-hidden rounded-lg bg-surface-container-high md:col-span-4 md:min-h-0"
          >
            <TileMedia
              imageUrl={t1.imageUrl}
              fallbackClass="bg-surface-container-low"
            />
            <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 md:bottom-10 md:left-10">
              <h3
                className={
                  t1.variant === "small"
                    ? "font-headline text-2xl font-extrabold text-primary sm:text-3xl"
                    : "font-headline text-3xl font-extrabold text-white mix-blend-difference sm:text-4xl"
                }
              >
                {t1.title}
              </h3>
              {t1.linkLabel ? (
                <span
                  className={
                    t1.variant === "small"
                      ? "mt-2 inline-block font-medium text-primary transition-all hover:underline hover:underline-offset-8"
                      : "mt-2 inline-block font-medium text-white underline underline-offset-8 mix-blend-difference"
                  }
                >
                  {t1.linkLabel}
                </span>
              ) : null}
            </div>
          </Link>
        </div>
        <div className="mx-auto mt-6 max-w-[1600px] md:h-[min(24rem,45vh)]">
          <Link
            data-home-collection-panel
            href={t2.href}
            className="group relative flex min-h-[14rem] items-center justify-center overflow-hidden rounded-lg bg-surface-container-highest md:min-h-full"
          >
            <div className="absolute inset-0">
              <TileMedia
                imageUrl={t2.imageUrl}
                fallbackClass="bg-surface-container-high"
              />
            </div>
            <div className="relative z-[1] px-4 text-center">
              <h3
                className={
                  t2.variant === "wide"
                    ? "font-headline text-4xl font-extrabold text-primary drop-shadow-sm sm:text-5xl"
                    : "font-headline text-3xl font-extrabold text-white mix-blend-difference sm:text-4xl"
                }
              >
                {t2.title}
              </h3>
              {t2.subtitle ? (
                <p className="mt-3 text-sm font-medium uppercase tracking-widest text-on-surface-variant sm:mt-4">
                  {t2.subtitle}
                </p>
              ) : null}
              {t2.linkLabel ? (
                <p className="mt-2 text-sm font-medium text-primary">{t2.linkLabel}</p>
              ) : null}
            </div>
          </Link>
        </div>
      </section>

      <section className="bg-surface-container-low py-14 sm:py-16 md:py-24 storefront-section-x">
        <div className="mx-auto max-w-[1600px]">
          <div
            ref={latestHeaderRef}
            className="mb-10 flex flex-col items-baseline justify-between gap-4 sm:mb-12 md:mb-16 md:flex-row"
          >
            <h2 className="font-headline text-3xl font-extrabold tracking-tighter sm:text-4xl">
              {home.latestSection.title}
            </h2>
            <div className="mx-8 hidden h-0.5 flex-grow bg-outline-variant opacity-20 md:block" />
            <Link
              href={home.latestSection.viewAllHref || "/shop"}
              className="font-medium text-primary transition-all hover:underline"
            >
              {home.latestSection.viewAllLabel}
            </Link>
          </div>
          {products.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant sm:py-16">
              <p>No products yet.</p>
            </div>
          ) : (
            <div
              ref={productsGridRef}
              className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-16 lg:grid-cols-4"
            >
              {products.map((product) => (
                <div key={product.id} data-home-product>
                  <CatalogProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        ref={clubRef}
        id="join-club"
        className="flex justify-center bg-surface px-[clamp(0.75rem,4vw,2rem)] py-16 text-center sm:py-24 scroll-mt-[5.5rem]"
      >
        <div className="max-w-xl">
          <h2 className="mb-4 font-headline text-2xl font-extrabold sm:mb-6 sm:text-3xl">
            {home.newsletter.title}
          </h2>
          <p className="mb-8 text-base leading-relaxed text-on-surface-variant sm:mb-10 sm:text-lg">
            {home.newsletter.body}
          </p>
          <form className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <input
              type="email"
              placeholder={home.newsletter.placeholder}
              className="min-h-[3rem] flex-grow rounded bg-surface-container-highest px-5 py-3 font-body outline-none focus:ring-1 focus:ring-secondary/40 sm:min-h-0 sm:px-6 sm:py-4"
            />
            <button
              type="submit"
              className="rounded bg-primary px-6 py-3 font-medium text-on-primary transition-all hover:opacity-90 sm:px-8 sm:py-4"
            >
              {home.newsletter.buttonLabel}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
