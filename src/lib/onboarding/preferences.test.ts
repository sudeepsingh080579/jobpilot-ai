import { describe, expect, it } from "vitest";
import { addLocation, MAX_LOCATIONS, moveItem, validatePreferences } from "@/lib/onboarding/preferences";

describe("onboarding preferences", () => {
  it("caps locations at 10 when adding chips", () => {
    let list: string[] = [];
    for (let i = 0; i < 12; i++) list = addLocation(list, `City ${i}`).list;
    expect(list).toHaveLength(MAX_LOCATIONS);
    expect(addLocation(list, "Another").error).toMatch(/up to 10/);
  });
  it("rejects more than 10 locations on the server", () => {
    const r = validatePreferences({ locations: Array.from({ length: 11 }, (_, i) => `C${i}`) });
    expect(r.ok).toBe(false);
  });
  it("keeps remote out of the city list", () => {
    expect(addLocation([], "Remote").error).toBeTruthy();
    expect(validatePreferences({ locations: ["Pune", "Remote - India"] }).ok).toBe(false);
    const r = validatePreferences({ locations: ["Pune"], remoteIndia: true, remoteInternational: false });
    expect(r.ok && r.value).toMatchObject({ locations: ["Pune"], remoteIndia: true, remoteInternational: false });
  });
  it("dedupes case-insensitively and preserves order; reorders", () => {
    const r = validatePreferences({ locations: ["Pune", "pune", "Mumbai"] });
    expect(r.ok && r.value.locations).toEqual(["Pune", "Mumbai"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a"], 0, 5)).toEqual(["a"]);
  });
  it("accepts multiple work arrangements and employment types, drops unknown values", () => {
    const r = validatePreferences({ workArrangements: ["remote", "hybrid", "onsite", "space"], employmentTypes: ["full_time", "contract", "x"] });
    expect(r.ok && r.value.workArrangements).toEqual(["remote", "hybrid", "onsite"]);
    expect(r.ok && r.value.employmentTypes).toEqual(["full_time", "contract"]);
  });
  it("requires essentials when completing", () => {
    const r = validatePreferences({}, { requireComplete: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(4);
    const good = validatePreferences({ targetRoles: ["PM"], remoteInternational: true, workArrangements: ["remote"], employmentTypes: ["part_time"] }, { requireComplete: true });
    expect(good.ok).toBe(true);
  });
  it("rejects out-of-range numbers instead of guessing", () => {
    const r = validatePreferences({ expectedCtcLakhs: -5, noticePeriodDays: 900, experienceYears: "abc" });
    expect(r.ok && r.value).toMatchObject({ expectedCtcLakhs: null, noticePeriodDays: null, experienceYears: 0 });
  });
});
