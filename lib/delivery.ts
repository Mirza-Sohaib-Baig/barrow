const londonDay = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/London",
});

const londonParts = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Europe/London",
});

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const value = parts.find((item) => item.type === type)?.value;
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 1;
}

function londonDate(now: Date): CalendarDate {
  const parts = londonParts.formatToParts(now);
  return {
    year: part(parts, "year"),
    month: part(parts, "month"),
    day: part(parts, "day"),
  };
}

function wholeDays(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function atUtcNoon(date: CalendarDate): Date {
  // Noon UTC stays on this calendar date in both GMT and BST.
  return new Date(Date.UTC(date.year, date.month - 1, date.day, 12));
}

export function deliveryWindow(
  option: { minDays: number; maxDays: number },
  now: Date,
): { start: Date; end: Date } {
  const today = londonDate(now);
  return {
    start: atUtcNoon(addCalendarDays(today, wholeDays(option.minDays))),
    end: atUtcNoon(addCalendarDays(today, wholeDays(option.maxDays))),
  };
}

export function formatDeliveryWindow(window: { start: Date; end: Date }): string {
  const start = londonDay.format(window.start);
  const end = londonDay.format(window.end);
  if (start === end) return `Arrives ${start}`;
  return `Arrives ${start} to ${end}`;
}
