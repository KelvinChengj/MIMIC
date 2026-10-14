import { it, expect } from "vitest";
import { decodeValues } from "./fdm";
it("uses FDM timestamps to detect stale and missing values", () => {
  const result = decodeValues(
    {
      values: {
        fresh: { value: 3.4, ts: 1200000 },
        old: { value: 2, ts: 0 },
        bad: { value: "3", ts: 1200000 },
      },
    },
    ["fresh", "old", "bad", "missing"],
    1200000,
  );
  expect(result.fresh).toEqual({ value: 3.4, ageMinutes: 0 });
  expect(result.old.ageMinutes).toBe(20);
  expect(result.bad.value).toBeNull();
  expect(result.missing.value).toBeNull();
});
it("rejects malformed FDM responses", () => {
  expect(() => decodeValues({}, [])).toThrow();
});
