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
import { buildMonthGrid, formatIsoDate, isValidIsoDate, moveIsoDate } from "@/lib/upload/date";

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
  if (!isValidIsoDate(value)) {
    return null;
  }

  return { year: Number(value.slice(0, 4)), monthIndex: Number(value.slice(5, 7)) - 1 };
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
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const labelId = useId();
  const dialogId = useId();
  const normalizedValue = isValidIsoDate(value) ? value : "";
  const selectedMonth = getCalendarMonth(normalizedValue);
  const [isOpen, setIsOpen] = useState(false);
  const [shouldFocusDay, setShouldFocusDay] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(
    () => selectedMonth ?? getCalendarMonth(getToday())!,
  );
  const [activeDate, setActiveDate] = useState(() => normalizedValue || getToday());
  const monthTitle = getMonthTitle(visibleMonth);
  const days = useMemo(
    () => buildMonthGrid(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.monthIndex, visibleMonth.year],
  );
  const today = getToday();
  const displayValue = formatIsoDate(normalizedValue) || "No date selected";

  useEffect(() => {
    if (isOpen && shouldFocusDay) {
      dayRefs.current.get(activeDate)?.focus();
      setShouldFocusDay(false);
    }
  }, [activeDate, isOpen, shouldFocusDay, visibleMonth]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setShouldFocusDay(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!isOpen || disabled) {
      return;
    }

    const nextActiveDate = normalizedValue || getToday();
    setVisibleMonth(getCalendarMonth(nextActiveDate) ?? getCalendarMonth(getToday())!);
    setActiveDate(nextActiveDate);
    setShouldFocusDay(true);
  }, [disabled, isOpen, normalizedValue]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setShouldFocusDay(false);
      }
    };

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [isOpen]);

  const openCalendar = () => {
    if (disabled) {
      return;
    }

    const nextActiveDate = normalizedValue || getToday();

    setVisibleMonth(getCalendarMonth(nextActiveDate) ?? getCalendarMonth(getToday())!);
    setActiveDate(nextActiveDate);
    setShouldFocusDay(true);
    setIsOpen(true);
  };

  const closeCalendar = (restoreFocus = false) => {
    setIsOpen(false);
    setShouldFocusDay(false);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const selectDate = (isoDate: string) => {
    if (disabled) {
      return;
    }
    onChange(isoDate);
    closeCalendar(true);
  };

  const changeVisibleMonth = (delta: number) => {
    if (disabled) {
      return;
    }
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
    setShouldFocusDay(true);
  };

  const dialog = isOpen
    ? createElement(
        "div",
        {
          "aria-labelledby": `${dialogId}-label`,
          className:
            "upload-calendar-popover absolute z-50 mt-2 w-[20rem] rounded-2xl border border-line bg-white p-4 text-ink shadow-2xl shadow-black/10",
          id: dialogId,
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
                "upload-control-focus flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-soft hover:text-ink",
              onClick: () => changeVisibleMonth(-1),
              disabled,
              type: "button",
            },
            createElement(ChevronLeft, { "aria-hidden": true, className: "h-4 w-4" }),
          ),
          createElement(
            "h2",
            { className: "text-sm font-semibold", id: `${dialogId}-label` },
            monthTitle,
          ),
          createElement(
            "button",
            {
              "aria-label": "Next month",
              className:
                "upload-control-focus flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-soft hover:text-ink",
              onClick: () => changeVisibleMonth(1),
              disabled,
              type: "button",
            },
            createElement(ChevronRight, { "aria-hidden": true, className: "h-4 w-4" }),
          ),
        ),
        createElement(
          "div",
          { "aria-label": monthTitle, className: "grid grid-cols-7 gap-1", role: "grid" },
          createElement(
            "div",
            { className: "col-span-7 grid grid-cols-7 gap-1", role: "row" },
            ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) =>
              createElement(
                "div",
                {
                  className: "pb-1 text-center text-xs font-medium uppercase tracking-wide text-muted",
                  key: weekday,
                  role: "columnheader",
                },
                weekday,
              ),
            ),
          ),
          ...Array.from({ length: 6 }, (_, weekIndex) =>
            createElement(
              "div",
              {
                className: "col-span-7 grid grid-cols-7 gap-1",
                key: `week-${weekIndex}`,
                role: "row",
              },
              ...days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
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
                const isToday = day.isoDate === today;

                return createElement(
                  "div",
                  {
                    "aria-current": isToday ? "date" : undefined,
                    "aria-selected": isSelected,
                    key: day.isoDate,
                    role: "gridcell",
                  },
                  createElement(
                    "button",
                    {
                      "aria-label": dayLabel,
                      className: [
                        "upload-control-focus h-9 w-full rounded-lg text-sm transition",
                        isSelected
                          ? "bg-brand-600 font-semibold text-white shadow-lg shadow-brand-600/20"
                          : "text-ink hover:bg-soft",
                        day.isCurrentMonth ? "" : "text-muted hover:text-muted",
                      ]
                        .filter(Boolean)
                        .join(" "),
                      onClick: () => selectDate(day.isoDate),
                      onKeyDown: handleDayKeyDown,
                      disabled,
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
                  ),
                );
              }),
            ),
          ),
        ),
      )
    : null;

  return createElement(
    "div",
    { className: "relative", ref: rootRef },
    createElement("input", { disabled, name, type: "hidden", value: normalizedValue }),
    createElement("span", { className: "mb-2 block text-sm font-medium text-ink", id: labelId }, label),
    createElement(
      "div",
      { className: "flex items-center gap-2" },
      createElement(
        "button",
        {
          "aria-controls": isOpen ? dialogId : undefined,
          "aria-expanded": isOpen,
          "aria-haspopup": "dialog",
          "aria-label": `${label}: ${displayValue}`,
          className:
            "upload-control-focus flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-line bg-soft px-3 text-left text-sm text-ink transition hover:border-line hover:bg-soft disabled:cursor-not-allowed disabled:opacity-50",
          disabled,
          onClick: () => (isOpen ? closeCalendar(true) : openCalendar()),
          ref: triggerRef,
          type: "button",
        },
        createElement(CalendarDays, { "aria-hidden": true, className: "h-4 w-4 shrink-0 text-brand-300" }),
        createElement("span", { className: normalizedValue ? "text-ink" : "text-muted" }, displayValue),
      ),
      normalizedValue
        ? createElement(
            "button",
            {
              "aria-label": "Clear date",
              className:
                "upload-control-focus flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-soft text-muted transition hover:border-line hover:bg-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
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
