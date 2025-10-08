"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "./utils";
import { buttonVariants } from "./button";

type CalendarMode = "single" | "multiple" | "range";

export interface CalendarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /**
   * Currently selected date(s). For `single` mode, pass a `Date`.
   * For `multiple`, pass an array of dates. For `range`, pass a
   * tuple containing the start and end dates.
   */
  selected?: Date | Date[] | [Date | null, Date | null];
  /**
   * Called when the selection changes.
   */
  onSelect?: (value: Date | Date[] | [Date | null, Date | null]) => void;
  /**
   * Selection behaviour. Defaults to `single`.
   */
  mode?: CalendarMode;
  /**
   * Month to display initially. Defaults to the current month.
   */
  initialMonth?: Date;
  /**
   * Whether to show days from the previous/next month.
   */
  showOutsideDays?: boolean;
}

const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: "short" });

function isDateArray(value: unknown): value is Date[] {
  return Array.isArray(value) && value.every((item) => item instanceof Date);
}

function isDateRange(
  value: unknown,
): value is [Date | null, Date | null] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    (value[0] === null || value[0] instanceof Date) &&
    (value[1] === null || value[1] instanceof Date)
  );
}

function Calendar({
  className,
  selected,
  onSelect,
  mode = "single",
  initialMonth,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [month, setMonth] = React.useState(initialMonth ?? new Date());

  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start, end });

  const handleSelect = (day: Date) => {
    if (!onSelect) return;

    if (mode === "single") {
      onSelect(day);
      return;
    }

    if (mode === "multiple") {
      const current = isDateArray(selected) ? selected : [];
      const exists = current.some((d) => isSameDay(d, day));
      const next = exists
        ? current.filter((d) => !isSameDay(d, day))
        : [...current, day];
      onSelect(next);
      return;
    }

    if (mode === "range") {
      const current = isDateRange(selected) ? selected : [null, null];
      const [startDate, endDate] = current;

      if (!startDate || (startDate && endDate)) {
        onSelect([day, null]);
        return;
      }

      if (day < startDate) {
        onSelect([day, startDate]);
      } else {
        onSelect([startDate, day]);
      }
    }
  };

  const isSelected = (day: Date) => {
    if (!selected) return false;

    if (mode === "single" && selected instanceof Date) {
      return isSameDay(selected, day);
    }

    if (mode === "multiple" && isDateArray(selected)) {
      return selected.some((d) => isSameDay(d, day));
    }

    if (mode === "range" && isDateRange(selected)) {
      const [startDate, endDate] = selected;
      if (!startDate) return false;
  if (!endDate) return isSameDay(startDate, day);
  return day >= startDate && day <= endDate;
    }

    return false;
  };

  const isRangeEdge = (day: Date) => {
    if (mode !== "range" || !isDateRange(selected)) return false;
    const [startDate, endDate] = selected;
    return (
      (startDate && isSameDay(startDate, day)) ||
      (endDate && isSameDay(endDate, day))
    );
  };

  const weekdays = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(startOfWeek(new Date()), index);
    return DAY_FORMATTER.format(date);
  });

  return (
    <div
      data-slot="calendar"
      className={cn("w-full rounded-lg border bg-card", className)}
      {...props}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "size-8 shrink-0"
          )}
          onClick={() => setMonth((current) => subMonth(current))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-sm font-medium">
          {format(month, "MMMM yyyy")}
        </div>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "size-8 shrink-0"
          )}
          onClick={() => setMonth((current) => addMonths(current, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 px-3 pb-2 text-center text-xs font-medium text-muted-foreground">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-3 pb-3">
  {days.map((day: Date) => {
          const outsideMonth = !isSameMonth(day, month);
          if (outsideMonth && !showOutsideDays) {
            return <div key={day.toISOString()} />;
          }

          const selectedState = isSelected(day);
          const isEdge = isRangeEdge(day);

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => handleSelect(day)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
                outsideMonth && "text-muted-foreground/60",
                selectedState && "bg-primary text-primary-foreground",
                selectedState && !isEdge && mode === "range" && "bg-primary/70",
                !selectedState && "hover:bg-accent hover:text-accent-foreground"
              )}
              aria-pressed={selectedState}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function subMonth(date: Date) {
  return addMonths(date, -1);
}

export { Calendar };
