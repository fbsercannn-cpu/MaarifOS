import type { ActivityStudioItem } from "./activity-studio-model.ts";

export type ActivityStudioDrawingPadMode = "drawing" | "coloring";

export interface ActivityDrawingPadEvidence {
  readonly mode: ActivityStudioDrawingPadMode;
  readonly strokeCount: number;
  readonly downloadedFileName: string | null;
}

export interface ActivityStudioDrawingColor {
  readonly id: string;
  readonly label: string;
  readonly value: `#${string}`;
}

export const ACTIVITY_STUDIO_DRAWING_COLORS: readonly ActivityStudioDrawingColor[] =
  Object.freeze([
    Object.freeze({ id: "lacivert", label: "Lacivert", value: "#17324d" }),
    Object.freeze({ id: "kirmizi", label: "Kırmızı", value: "#d94a4a" }),
    Object.freeze({ id: "sari", label: "Sarı", value: "#f3c64e" }),
    Object.freeze({ id: "yesil", label: "Yeşil", value: "#2b8a66" }),
    Object.freeze({ id: "mavi", label: "Mavi", value: "#3a78d4" }),
    Object.freeze({ id: "mor", label: "Mor", value: "#8d5cc6" }),
  ]);

export interface DrawingPadCanvasMetrics {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly pixelRatio: number;
  readonly backingWidth: number;
  readonly backingHeight: number;
}

export interface DrawingPadRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface DrawingPadPoint {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
}

function positiveOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function activityStudioDrawingPadMode(
  activity: Pick<ActivityStudioItem, "category">,
): ActivityStudioDrawingPadMode | null {
  if (activity.category === "cizim") return "drawing";
  if (activity.category === "boyama") return "coloring";
  return null;
}

export function calculateDrawingPadCanvasMetrics(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): DrawingPadCanvasMetrics {
  const safeCssWidth = positiveOr(cssWidth, 1);
  const safeCssHeight = positiveOr(cssHeight, 1);
  const safePixelRatio = positiveOr(devicePixelRatio, 1);

  return Object.freeze({
    cssWidth: safeCssWidth,
    cssHeight: safeCssHeight,
    pixelRatio: safePixelRatio,
    backingWidth: Math.max(1, Math.round(safeCssWidth * safePixelRatio)),
    backingHeight: Math.max(1, Math.round(safeCssHeight * safePixelRatio)),
  });
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function normalizeDrawingPadPoint(
  clientX: number,
  clientY: number,
  pressure: number,
  rect: DrawingPadRect,
): DrawingPadPoint {
  const width = positiveOr(rect.width, 1);
  const height = positiveOr(rect.height, 1);
  const normalizedPressure = pressure > 0 ? pressure : 0.5;

  return Object.freeze({
    x: clamp01((clientX - rect.left) / width),
    y: clamp01((clientY - rect.top) / height),
    pressure: clamp01(normalizedPressure),
  });
}

export function buildDrawingPadDownloadName(title: string): string {
  const safeTitle = title
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 52);
  return `maarifos-${safeTitle || "cizim"}.png`;
}
