import type {
  GrowthMeasurementMetric,
  GrowthMeasurementUnit,
} from "../../core/domain/growth-measurements.ts";

const MAX_INPUT_LENGTH = 16;

export function growthUnit(metric: GrowthMeasurementMetric): GrowthMeasurementUnit {
  return metric === "height" ? "mm" : "g";
}

export function parseGrowthDisplayValue(
  raw: string,
  metric: GrowthMeasurementMetric,
): number {
  const input = raw.trim();
  if (!input || input.length > MAX_INPUT_LENGTH ||
    !/^\d+(?:[,.]\d+)?$/u.test(input)) {
    throw new Error(metric === "height"
      ? "Boyu santimetre olarak yazın; örnek: 112,5."
      : "Kiloyu kilogram olarak yazın; örnek: 19,40.");
  }
  const [wholeText, fractionText = ""] = input.replace(",", ".").split(".");
  const maximumDecimals = metric === "height" ? 1 : 3;
  const significantFraction = fractionText.replace(/0+$/u, "");
  if (significantFraction.length > maximumDecimals) {
    throw new Error(metric === "height"
      ? "Boy en fazla 1 ondalık basamakla, milimetre hassasiyetinde girilebilir."
      : "Kilo en fazla 3 ondalık basamakla, gram hassasiyetinde girilebilir.");
  }
  const scale = metric === "height" ? 10 : 1_000;
  const fraction = fractionText.slice(0, maximumDecimals)
    .padEnd(maximumDecimals, "0");
  const value = Number(wholeText) * scale + Number(fraction || "0");
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Ölçüm sıfırdan büyük, geçerli bir sayı olmalıdır.");
  }
  return value;
}

export function parseGrowthStoredValue(
  raw: string,
  unit: GrowthMeasurementUnit,
  metric: GrowthMeasurementMetric,
): number {
  if ((metric === "height" && unit !== "mm") ||
    (metric === "weight" && unit !== "g")) {
    throw new Error("Ölçüm türü ile kalıcı birim uyuşmuyor.");
  }
  if (!/^\d+$/u.test(raw.trim())) {
    throw new Error("Kalıcı ölçüm değeri pozitif tam sayı olmalıdır.");
  }
  const value = Number(raw.trim());
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Kalıcı ölçüm değeri pozitif tam sayı olmalıdır.");
  }
  return value;
}

const heightFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const weightFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function formatGrowthInteger(
  integerValue: number,
  metric: GrowthMeasurementMetric,
  options: { withUnit?: boolean; signed?: boolean } = {},
): string {
  if (!Number.isFinite(integerValue)) return "—";
  const display = metric === "height" ? integerValue / 10 : integerValue / 1_000;
  const formatted = (metric === "height" ? heightFormatter : weightFormatter)
    .format(Math.abs(display));
  const sign = options.signed && display !== 0 ? (display > 0 ? "+" : "−") : "";
  const unit = metric === "height" ? "cm" : "kg";
  return `${sign}${formatted}${options.withUnit === false ? "" : ` ${unit}`}`;
}
