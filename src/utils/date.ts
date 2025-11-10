import { format } from "date-fns";

export function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDisplayDate(value: string) {
  try {
    return format(new Date(value), "PPP");
  } catch {
    return value;
  }
}
