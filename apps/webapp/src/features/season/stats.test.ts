/// <reference types="node" />
// Runs with `node --test`; the app's tsconfig only loads browser types.
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Season, Strategy } from "@cropilot/api"
import {
  countFlag,
  marginScale,
  median,
  niceStep,
  summarizeStrategy,
  swarmOffsets,
  ticks,
} from "./stats.ts"

const season = (
  id: string,
  similar: boolean,
  extra: Partial<Season> = {}
): Season => ({
  season_id: id,
  enso_phase: "nino",
  oni: 1,
  root_zone_wetness: 0.7,
  start_soil: "wet",
  is_similar: similar,
  rain_oct_mar_mm: 800,
  water_deficit_at_flowering: false,
  heat_at_flowering: false,
  excess_water: null,
  ...extra,
})

const strategy = (by_season: Record<string, number | null>): Strategy => ({
  strategy_id: "s",
  name: "S",
  sequence: ["Soy"],
  is_current: true,
  carbon_input: {
    value: 1,
    unit: "t C/ha/yr",
    provenance: "scenario",
    source_ids: [],
  },
  margin: {
    unit: "USD/ha/yr",
    basis: "per_year",
    includes_rent: false,
    price_basis: "test",
    provenance: "scenario",
    source_ids: [],
    by_season,
  },
})

describe("median", () => {
  it("handles odd and even counts", () => {
    assert.equal(median([3, 1, 2]), 2)
    assert.equal(median([4, 1, 3, 2]), 2.5)
  })
  it("skips nulls instead of reading them as zero", () => {
    assert.equal(median([null, 10, undefined, 20]), 15)
  })
  it("returns null when nothing is known", () => {
    assert.equal(median([]), null)
    assert.equal(median([null]), null)
  })
})

describe("summarizeStrategy", () => {
  const seasons = [
    season("2000/01", true),
    season("2001/02", true),
    season("2002/03", false),
    season("2003/04", true),
  ]

  it("uses only similar seasons for the median and the worst year", () => {
    const s = summarizeStrategy(
      strategy({
        "2000/01": 300,
        "2001/02": 100,
        "2002/03": -500,
        "2003/04": 200,
      }),
      seasons
    )
    assert.equal(s.median, 200)
    assert.deepEqual(s.worst, {
      season_id: "2001/02",
      value: 100,
      similar: true,
    })
    assert.equal(s.n, 3)
    assert.equal(s.points.length, 4)
  })

  it("reports similar seasons without a margin instead of dropping them silently", () => {
    const s = summarizeStrategy(
      strategy({ "2000/01": 300, "2001/02": null, "2002/03": 50 }),
      seasons
    )
    assert.equal(s.n, 1)
    assert.equal(s.nSimilar, 3)
    assert.equal(s.median, 300)
  })

  it("has no median or worst year when no similar season has a margin", () => {
    const s = summarizeStrategy(strategy({ "2002/03": 50 }), seasons)
    assert.equal(s.median, null)
    assert.equal(s.worst, null)
  })
})

describe("countFlag", () => {
  it("keeps unknown seasons out of both counts", () => {
    const seasons = [
      season("2000/01", true, { water_deficit_at_flowering: true }),
      season("2001/02", true, { water_deficit_at_flowering: false }),
      season("2002/03", true, { water_deficit_at_flowering: null }),
    ]
    assert.deepEqual(countFlag(seasons, "water_deficit_at_flowering"), {
      yes: 1,
      known: 2,
      total: 3,
    })
  })
})

describe("scale", () => {
  it("picks 1-2-5 steps", () => {
    assert.equal(niceStep(400), 100)
    assert.equal(niceStep(90), 20)
    assert.equal(niceStep(40_000), 10_000)
  })
  it("fits the data instead of starting at zero", () => {
    const { domain, step } = marginScale([75, 130, 430])
    assert.equal(step, 100)
    assert.deepEqual(domain, [50, 450])
    assert.deepEqual(ticks(domain, step), [100, 200, 300, 400])
  })
  it("never returns an empty domain or runaway ticks", () => {
    assert.ok(marginScale([200]).domain[0] < 200)
    assert.deepEqual(marginScale([]).domain, [0, 100])
    assert.ok(ticks([0, 1e9], 1).length <= 50)
  })
})

describe("swarmOffsets", () => {
  it("leaves separated dots on the line", () => {
    assert.deepEqual(swarmOffsets([0, 50, 100]), [0, 0, 0])
  })
  it("moves overlapping dots off each other", () => {
    const y = swarmOffsets([100, 102, 104])
    assert.equal(new Set(y).size, 3)
  })
})
