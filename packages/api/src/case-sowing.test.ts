import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { sowingWindows } from "./case-sowing.ts"
import { zCaseBundle } from "./generated/zod.gen.ts"

const bundle = zCaseBundle.parse(
  JSON.parse(
    readFileSync(
      new URL(
        "../../../apps/backend/app/modules/cases/resources/pergamino.json",
        import.meta.url
      ),
      "utf8"
    )
  )
)

test("the three water rotations share one maize window in Pergamino", () => {
  const windows = sowingWindows(bundle)
  assert.equal(windows.length, 1)
  const [window] = windows
  assert.ok(window)
  assert.equal(window.crop, "Maize")
  assert.equal(window.strategyIds.length, 3)
  assert.deepEqual(
    window.shifts.map((shift) => shift.shiftDays),
    [-14, -7, 0, 7, 14]
  )
  assert.deepEqual(
    window.shifts.map((shift) => shift.typicalSowingDate),
    ["2001-10-07", "2001-10-14", "2001-10-21", "2001-10-28", "2001-11-04"]
  )
})

test("medians and fewest counts summarize the analog campaigns", () => {
  const [window] = sowingWindows(bundle)
  assert.ok(window)
  assert.equal(window.campaigns.length, 5)
  assert.equal(window.lowestMedianStressDays, 24)
  assert.deepEqual(window.lowestMedianShifts, [-14, -7])
  assert.equal(window.defaultMedianStressDays, 31)
  assert.equal(window.topFewestCount, 2)
  assert.deepEqual(window.topFewestShifts, [-7, 14])
  for (const campaign of window.campaigns) {
    assert.equal(
      campaign.fewestStressDays,
      Math.min(...campaign.cells.map((cell) => cell.stressDays))
    )
  }
})

test("a missing run fails instead of counting as zero stress days", () => {
  const water = bundle.compare.water
  assert.ok(water)
  const dropped = water.episodes.findIndex(
    (episode) =>
      episode.scenario_id?.startsWith("analog:") &&
      episode.summer_shift_days === 7 &&
      episode.depth_m === water.default_depth_m &&
      episode.initial_water_fraction === water.default_initial_water_fraction
  )
  assert.notEqual(dropped, -1)
  const incomplete = {
    ...bundle,
    compare: {
      ...bundle.compare,
      water: {
        ...water,
        episodes: water.episodes.filter((_, index) => index !== dropped),
      },
    },
  }
  assert.throws(() => sowingWindows(incomplete), /Missing or duplicate/)
})

test("zones without water scenarios have no sowing window", () => {
  assert.deepEqual(
    sowingWindows({ ...bundle, compare: { ...bundle.compare, water: null } }),
    []
  )
})
