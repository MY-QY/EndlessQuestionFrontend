import dayjs, { type Dayjs } from "dayjs";

export function monthCalendar(
  month: Dayjs,
  signedDays: number[],
  now = dayjs(),
) {
  const first = month.startOf("month");
  const yearStart = first.startOf("year");
  const daysInYear = yearStart.add(1, "year").diff(yearStart, "day");
  const records = new Set(
    signedDays.filter(
      (day) => Number.isInteger(day) && day > 0 && day <= daysInYear,
    ),
  );
  const offset = (first.day() + 6) % 7;
  const dates = Array.from({ length: first.daysInMonth() }, (_, index) => {
    const date = first.add(index, "day");
    return {
      date: date.format("YYYY-MM-DD"),
      day: index + 1,
      signed: records.has(date.diff(yearStart, "day") + 1),
      today: date.isSame(now, "day"),
      future: date.isAfter(now, "day"),
    };
  });
  const cells = Array.from(
    { length: Math.ceil((offset + dates.length) / 7) * 7 },
    (_, index) => dates[index - offset] || null,
  );
  return {
    cells,
    monthCount: dates.filter((date) => date.signed).length,
    yearCount: records.size,
  };
}
