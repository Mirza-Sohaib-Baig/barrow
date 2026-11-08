import { config } from "@/lib/config";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});

const relativeFormat = new Intl.RelativeTimeFormat("en-GB", {
  numeric: "auto",
});

const priceSymbol =
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: config.currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? config.currency;

const relativeUnits: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

export function formatPrice(pence: number): string {
  const negative = pence < 0;
  const absolute = Math.abs(Math.trunc(pence));
  const major = Math.floor(absolute / 100);
  const minor = (absolute % 100).toString().padStart(2, "0");
  const grouped = new Intl.NumberFormat("en-GB").format(major);
  return `${negative ? "-" : ""}${priceSymbol}${grouped}.${minor}`;
}

export function formatDate(value: Date): string {
  return dateFormat.format(value);
}

export function formatRelative(value: Date, now: Date = new Date()): string {
  const deltaMs = value.getTime() - now.getTime();
  const elapsed = Math.abs(deltaMs);
  const smallest = relativeUnits[relativeUnits.length - 1];
  if (!smallest) {
    throw new Error("Relative time units are not configured.");
  }
  const match = relativeUnits.find((entry) => elapsed >= entry.ms) ?? smallest;
  const amount = Math.round(deltaMs / match.ms);
  return relativeFormat.format(amount, match.unit);
}
