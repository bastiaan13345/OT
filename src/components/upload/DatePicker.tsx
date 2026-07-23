"use client";

import {
  createElement,
  KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { buildMonthGrid, formatIsoDate, moveIsoDate } from "@/lib/upload/date";

type CalendarMonth = {
  year: number;
  monthIndex: number;
};

type DatePickerProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function createLocalNoon(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12);
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getCalendarMonth(value: string): CalendarMonth | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = createLocalNoon(year, monthIndex, day);

  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day
    ? { year, monthIndex }
    : null;
}

function getToday() {
  const date = new Date();

  return toIsoDate(date);
}

function getMonthTitle({ year, monthIndex }: CalendarMonth) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    createLocalNoon(year, monthIndex, 1),
  );
}

function moveMonth({ year, monthIndex }: CalendarMonth, delta: number): CalendarMonth {
  const date = createLocalNoon(year, monthIndex + delta, 1);

  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

function moveDateToMonth(value: string, targetMonth: CalendarMonth) {
  const day = Number(value.slice(8, 10));
  const isValidDate = getCalendarMonth(value) !== null;
  const lastDay = createLocalNoon(targetMonth.year, targetMonth.monthIndex + 1, 0).getDate();

  return toIsoDate(
    createLocalNoon(targetMonth.year, targetMonth.monthIndex, isValidDate ? Math.min(day, lastDay) : 1),
  );
}

/** A controlled optional calendar-date field that serializes as an ISO date. */
export function DatePicker({ label, name, value, onChange, disabled = false }: DatePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const labelId = useId();
  const dialogId = useId();
  const selectedMonth = getCalendarMonth(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(
    () => selectedMonth ?? getCalendarMonth(getToday())!,
  );
  const [activeDate, setActiveDate] = useState(() => value || getToday());
  const monthTitle = getMonthTitle(visibleMonth);
  const days = useMemo(
    () => buildMonthGrid(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.monthIndex, visibleMonth.year],
  );

  useEffect(() => {
    if (isOpen) {
      dayRefs.current.get(activeDate)?.focus();
    }
  }, [activeDate, isOpen, visibleMonth]);

  const openCalendar = () => {
    const nextActiveDate = value || getToday();

    setVisibleMonth(getCalendarMonth(nextActiveDate) ?? getCalendarMonth(getToday())!);
    setActiveDate(nextActiveDate);
    setIsOpen(true);
  };

  const closeCalendar = (restoreFocus = false) => {
    setIsOpen(false);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const selectDate = (isoDate: string) => {
    onChange(isoDate);
    closeCalendar(true);
  };

  const changeVisibleMonth = (delta: number) => {
    const nextMonth = moveMonth(visibleMonth, delta);

    setVisibleMonth(nextMonth);
    setActiveDate((current) => moveDateToMonth(current, nextMonth));
  };

  const handleDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      selectDate(activeDate);
      return;
    }

    const nextDate = moveIsoDate(activeDate, event.key);

    if (nextDate === activeDate) {
      return;
    }

    event.preventDefault();
    setActiveDate(nextDate);
    setVisibleMonth(getCalendarMonth(nextDate) ?? visibleMonth);
  };

  const dialog = isOpen
    ? createElement(
        "div",
        {
          "aria-label": `${label} calendar`,
          className:
            "upload-calendar-popover absolute z-50 mt-2 w-[20rem] rounded-2xl border border-white/10 bg-surface-900 p-4 text-white shadow-2xl shadow-black/50",
          onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeCalendar(true);
            }
          },
          role: "dialog",
        },
        createElement(
          "div",
          { className: "mb-4 flex items-center justify-between gap-3" },
          createElement(
            "button",
            {
              "aria-label": "Previous month",
              className:
                "upload-control-focus flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-white/10 hover:text-white",
              onClick: () => changeVisibleMonth(-1),
              type: "button",
            },
            createElement(ChevronLeft, { "aria-hidden": true, className: "h-4 w-4" }),
          ),
          createElement(
            "h2",
            { className: "text-sm font-semibold", id: dialogId },
            monthTitle,
          ),
          createElement(
            "button",
            {
              "aria-label": "Next month",
              className:
                "upload-control-focus flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-white/10 hover:text-white",
              onClick: () => changeVisibleMonth(1),
              type: "button",
            },
            createElement(ChevronRight, { "aria-hidden": true, className: "h-4 w-4" }),
          ),
        ),
        createElement(
          "div",
          { "aria-label": monthTitle, className: "grid grid-cols-7 gap-1", role: "grid" },
          ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) =>
            createElement(
              "div",
              {
                className: "pb-1 text-center text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500",
                key: weekday,
                role: "columnheader",
              },
              weekday,
            ),
          ),
          ...days.map((day) => {
            const dayLabel = new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "long",
              weekday: "long",
              year: "numeric",
            }).format(
              createLocalNoon(
                Number(day.isoDate.slice(0, 4)),
                Number(day.isoDate.slice(5, 7)) - 1,
                Number(day.isoDate.slice(8, 10)),
              ),
            );
            const isSelected = day.isoDate === value;

            return createElement(
              "button",
              {
                "aria-current": isSelected ? "date" : undefined,
                "aria-label": dayLabel,
                className: [
                  "upload-control-focus h-9 rounded-lg text-sm transition",
                  isSelected
                    ? "bg-brand-600 font-semibold text-white shadow-lg shadow-brand-600/20"
                    : "text-zinc-200 hover:bg-white/10",
                  day.isCurrentMonth ? "" : "text-zinc-600 hover:text-zinc-300",
                ]
                  .filter(Boolean)
                  .join(" "),
                key: day.isoDate,
                onClick: () => selectDate(day.isoDate),
                onKeyDown: handleDayKeyDown,
                ref: (element: HTMLButtonElement | null) => {
                  if (element) {
                    dayRefs.current.set(day.isoDate, element);
                  } else {
                    dayRefs.current.delete(day.isoDate);
                  }
                },
                tabIndex: day.isoDate === activeDate ? 0 : -1,
                type: "button",
              },
              day.dayOfMonth,
            );
          }),
        ),
      )
    : null;

  return createElement(
    "div",
    { className: "relative" },
    createElement("input", { name, type: "hidden", value }),
    createElement("span", { className: "mb-2 block text-sm font-medium text-zinc-200", id: labelId }, label),
    createElement(
      "div",
      { className: "flex items-center gap-2" },
      createElement(
        "button",
        {
          "aria-controls": isOpen ? dialogId : undefined,
          "aria-expanded": isOpen,
          "aria-haspopup": "dialog",
          "aria-labelledby": labelId,
          className:
            "upload-control-focus flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 text-left text-sm text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50",
          disabled,
          onClick: openCalendar,
          ref: triggerRef,
          type: "button",
        },
        createElement(CalendarDays, { "aria-hidden": true, className: "h-4 w-4 shrink-0 text-brand-300" }),
        createElement("span", { className: value ? "text-white" : "text-zinc-500" }, formatIsoDate(value) || "Choose date"),
      ),
      value
        ? createElement(
            "button",
            {
              "aria-label": "Clear date",
              className:
                "upload-control-focus flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
              disabled,
              onClick: () => onChange(""),
              type: "button",
            },
            createElement(X, { "aria-hidden": true, className: "h-4 w-4" }),
          )
        : null,
    ),
    dialog,
  );
}
