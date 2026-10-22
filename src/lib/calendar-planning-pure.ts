/** Container number format: `C01`, `C02`, … (zero-padded to 2 digits, 100+ stays unpadded). */
export function formatContainerNumber(counter: number): string {
  return `C${String(counter).padStart(2, "0")}`;
}

/** Air shipment number format: `A01`, `A02`, … (mirrors formatContainerNumber). */
export function formatAirNumber(counter: number): string {
  return `A${String(counter).padStart(2, "0")}`;
}

/** 3-month rolling window starting at the current month. */
export function planningWindow(now: Date = new Date()): {
  start: Date;
  end: Date;
  months: { year: number; month: number; label: string }[];
} {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59);
  const months: { year: number; month: number; label: string }[] = [];
  const labels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  for (let i = 0; i < 3; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${labels[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return { start, end, months };
}

export interface DayCell {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const jsDow = firstOfMonth.getDay();
  const offset = (jsDow + 6) % 7;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month - 1, 1 - offset + i);
    cells.push({
      date: d,
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      isCurrentMonth: d.getMonth() === month - 1,
      isToday:
        `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` === todayKey,
    });
  }
  return cells;
}
