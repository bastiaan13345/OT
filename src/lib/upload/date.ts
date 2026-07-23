export type CalendarArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

export type MonthGridDay = {
  isoDate: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function createLocalNoon(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = createLocalNoon(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Returns whether a value is a real ISO calendar date. */
export function isValidIsoDate(value: string) {
  return parseIsoDate(value) !== null;
}

/** Formats an ISO calendar date without parsing it as UTC. */
export function formatIsoDate(value: string, locale = "en-GB") {
  const date = parseIsoDate(value);

  return date
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date)
    : "";
}

/** Builds a Monday-first, six-week grid for a zero-indexed month. */
export function buildMonthGrid(year: number, monthIndex: number): MonthGridDay[] {
  const firstOfMonth = createLocalNoon(year, monthIndex, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = createLocalNoon(year, monthIndex, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = createLocalNoon(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );

    return {
      isoDate: toIsoDate(date),
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === monthIndex,
    };
  });
}

/** Moves a valid ISO calendar date by one calendar-day or calendar-week step. */
export function moveIsoDate(value: string, key: string) {
  const date = parseIsoDate(value);
  const deltaByKey: Record<CalendarArrowKey, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };
  const delta = deltaByKey[key as CalendarArrowKey];

  if (!date || delta === undefined) {
    return value;
  }

  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
}
