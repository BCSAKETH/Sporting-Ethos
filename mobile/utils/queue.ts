import type { Checkin } from "../types/models";

const ACTIVE_STATUSES = ["waiting", "paused"];

/** Emergencies first, then arrival order — mirrors the web app's live queue (src/lib/store.js). */
export function sortQueue(rows: Checkin[]): Checkin[] {
  return [...rows].sort((a, b) => {
    const aPriority = a.priority === "emergency" ? 0 : 1;
    const bPriority = b.priority === "emergency" ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime();
  });
}

export function isActiveCheckin(row: Checkin): boolean {
  return ACTIVE_STATUSES.includes(row.status);
}

/** 1-based position of a checkin within the active (waiting/paused) queue, or null if not active. */
export function queuePosition(checkinId: string, queue: Checkin[]): number | null {
  const active = sortQueue(queue.filter(isActiveCheckin));
  const idx = active.findIndex((row) => row.id === checkinId);
  return idx >= 0 ? idx + 1 : null;
}
