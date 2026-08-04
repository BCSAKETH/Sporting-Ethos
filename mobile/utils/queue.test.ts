import { isActiveCheckin, queuePosition, sortQueue } from "./queue";
import type { Checkin } from "../types/models";

function checkin(overrides: Partial<Checkin>): Checkin {
  return {
    id: "id",
    name: "Patient",
    appointment_id: null,
    appointment_ref: null,
    check_in_time: "2026-01-01T09:00:00Z",
    status: "waiting",
    priority: "normal",
    gender: null,
    age: null,
    hash: null,
    notes: null,
    source: "self",
    pharmacy: null,
    patient_id: null,
    hospital_id: "hospital-1",
    department_id: null,
    doctor_id: null,
    updated_at: "2026-01-01T09:00:00Z",
    ...overrides,
  };
}

describe("sortQueue", () => {
  it("puts emergencies ahead of everyone else regardless of arrival order", () => {
    const rows = [
      checkin({ id: "a", check_in_time: "2026-01-01T09:00:00Z", priority: "normal" }),
      checkin({ id: "b", check_in_time: "2026-01-01T09:05:00Z", priority: "emergency" }),
      checkin({ id: "c", check_in_time: "2026-01-01T09:10:00Z", priority: "normal" }),
    ];
    expect(sortQueue(rows).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("otherwise orders by earliest arrival first", () => {
    const rows = [
      checkin({ id: "later", check_in_time: "2026-01-01T09:10:00Z" }),
      checkin({ id: "earlier", check_in_time: "2026-01-01T09:00:00Z" }),
    ];
    expect(sortQueue(rows).map((r) => r.id)).toEqual(["earlier", "later"]);
  });
});

describe("isActiveCheckin", () => {
  it.each(["waiting", "paused"])("treats %s as active", (status) => {
    expect(isActiveCheckin(checkin({ status }))).toBe(true);
  });

  it.each(["in_consult", "done", "left", "no_show"])("treats %s as inactive", (status) => {
    expect(isActiveCheckin(checkin({ status }))).toBe(false);
  });
});

describe("queuePosition", () => {
  it("returns the 1-based position among active rows only", () => {
    const rows = [
      checkin({ id: "a", check_in_time: "2026-01-01T09:00:00Z", status: "done" }),
      checkin({ id: "b", check_in_time: "2026-01-01T09:05:00Z", status: "waiting" }),
      checkin({ id: "c", check_in_time: "2026-01-01T09:10:00Z", status: "waiting" }),
    ];
    expect(queuePosition("b", rows)).toBe(1);
    expect(queuePosition("c", rows)).toBe(2);
  });

  it("returns null once the patient is no longer active in the queue", () => {
    const rows = [checkin({ id: "a", status: "done" })];
    expect(queuePosition("a", rows)).toBeNull();
  });
});
