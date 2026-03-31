/**
 * Scene script schema for static HTML guide demos (see public/guide-demos/demo-runtime.js).
 * Demos use plain JS objects; this file documents the contract for maintainers and future React embeds.
 */

/** Normalized cursor position inside the stage (0–1). */
export type DemoCursorPoint = { x: number; y: number };

/**
 * One timeline keyframe. Times are in virtual milliseconds (scaled by player speed).
 */
export type GuideDemoTimelineEvent = {
  t: number;
  x?: number;
  y?: number;
  cap?: string;
  speak?: string;
  /** When true, plays click sound, ripple, and runs opts.onClick from attachPlayer. */
  click?: boolean;
  /** Highlights then activates sidebar item; updates URL bar unless skipUrl. */
  navKey?: string;
  navFlash?: string;
  navDelay?: number;
  skipUrl?: boolean;
  scene?: number;
  /** Optional HTML5 narration src (rare; prefer Web Speech via speak). */
  narrSrc?: string;
  /** Custom flags consumed by per-demo opts.onClick (e.g. flashSearch). */
  flashSearch?: boolean;
  flashPub?: boolean;
  [key: string]: unknown;
};

export type GuideDemoPlayerOptions = {
  timeline: GuideDemoTimelineEvent[];
  totalMs: number;
  currentKey: string;
  defaultUrl?: string;
  urlForScene?: (_idx: number) => string | null;
  reset?: () => void;
  onClick?: (_ev: GuideDemoTimelineEvent, _ctx: unknown) => void;
};
