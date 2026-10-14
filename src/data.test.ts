import { describe, it, expect } from "vitest";
import {
  upwTags,
  tagStatus,
  aggregate,
  validRules,
  seedTags,
  sites,
  systems,
  matrix,
} from "./data";
describe("FDM threshold evaluation", () => {
  it("evaluates both upper and lower red thresholds", () => {
    expect(tagStatus(upwTags[0])).toBe("red");
    expect(tagStatus(upwTags[1])).toBe("red");
  });
  it("keeps equality inside the applicable limit", () => {
    expect(tagStatus({ ...upwTags[0], value: 3 })).toBe("yellow");
    expect(tagStatus({ ...upwTags[0], value: 1 })).toBe("green");
    expect(tagStatus({ ...upwTags[1], value: 18 })).toBe("green");
  });
  it("detects missing, nonfinite and stale samples", () => {
    expect(tagStatus(upwTags[7])).toBe("gray");
    expect(tagStatus({ ...upwTags[0], value: NaN })).toBe("gray");
    expect(tagStatus({ ...upwTags[0], ageMinutes: 15 })).toBe("gray");
  });
  it("prioritizes red then yellow then incomplete data", () => {
    expect(aggregate(upwTags)).toBe("red");
    expect(aggregate([upwTags[3], upwTags[7]])).toBe("yellow");
    expect(aggregate([upwTags[5], upwTags[7]])).toBe("gray");
    expect(aggregate([upwTags[5]])).toBe("green");
  });
  it("excludes disabled tags and handles empty selection", () => {
    expect(aggregate([{ ...upwTags[0], enabled: false }, upwTags[5]])).toBe(
      "green",
    );
    expect(aggregate([])).toBe("gray");
  });
  it("rejects inverted and invalid thresholds", () => {
    expect(validRules(upwTags)).toBe(true);
    expect(validRules([{ ...upwTags[0], red: 0 }])).toBe(false);
    expect(validRules([{ ...upwTags[1], red: 19 }])).toBe(false);
    expect(validRules([{ ...upwTags[1], yellow: NaN }])).toBe(false);
  });
});

it("keeps the overview and detail statuses consistent for all 28 systems", () => {
  sites.forEach((site, i) =>
    systems.forEach((system, j) =>
      expect(aggregate(seedTags(site, system.id))).toBe(matrix[i][j]),
    ),
  );
});
