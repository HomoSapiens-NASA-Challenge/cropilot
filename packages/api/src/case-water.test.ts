import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  changeWaterStartingPoint,
  defaultWaterSettings,
  findWaterEpisode,
  hasWaterRuns,
  matchesWaterSettings,
  waterAnalogCampaigns,
} from "./case-water.ts"
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
const water = bundle.compare.water
assert.ok(water)
const settings = defaultWaterSettings(water)

test("every released analog episode is selected by all five identifying dimensions", () => {
  for (const episode of water.episodes) {
    if (episode.scenario_id === null) continue
    assert.equal(
      findWaterEpisode(
        water,
        episode.strategy_id,
        episode.scenario_id,
        episode
      ),
      episode
    )
    assert.ok(matchesWaterSettings(episode, episode))
  }
})

test("the default historical selection uses the first-ranked analog and released crop values", () => {
  const campaign = waterAnalogCampaigns(bundle.years_like_this.campaigns)[0]
  assert.equal(campaign?.scenario_id, "analog:1997/98")
  assert.deepEqual(settings, {
    depth_m: 1,
    initial_water_fraction: 0.5,
    summer_shift_days: 0,
  })
  const episode = findWaterEpisode(
    water,
    "maize-soy-soy",
    campaign.scenario_id,
    settings
  )
  assert.equal(episode?.run_id, "e9abc60cd9126704cf34")
  assert.equal(episode?.crop_et_deficit_mm, 365.7366793510329)
  assert.equal(episode?.crops[0]?.sowing_date, "1997-10-21")
})

test("sowing shifts select their own released run, crop date and deficit", () => {
  const episode = findWaterEpisode(water, "maize-soy-soy", "analog:1997/98", {
    ...settings,
    summer_shift_days: 7,
  })
  assert.equal(episode?.run_id, "299aadff7f85009c7572")
  assert.equal(episode?.crop_et_deficit_mm, 301.7024220344003)
  assert.equal(episode?.crops[0]?.sowing_date, "1997-10-28")
})

test("starting-point changes preserve a supported date and reset only unavailable shifts", () => {
  const shifted = { ...settings, summer_shift_days: 7 }
  assert.deepEqual(
    changeWaterStartingPoint(water, shifted, { depth_m: 1 }),
    shifted
  )
  assert.deepEqual(
    changeWaterStartingPoint(water, shifted, { initial_water_fraction: 0.5 }),
    shifted
  )
  const shallow = changeWaterStartingPoint(water, shifted, { depth_m: 0.6 })
  assert.deepEqual(shallow, { ...settings, depth_m: 0.6 })
  assert.equal(
    findWaterEpisode(water, "maize-soy-soy", "analog:1997/98", shallow)?.run_id,
    "349c3cf2f04825dca50e"
  )
  assert.deepEqual(
    changeWaterStartingPoint(water, shifted, { initial_water_fraction: 0.25 }),
    { ...settings, initial_water_fraction: 0.25 }
  )
})

test("initial reserves resolve distinct real runs even when later rainfall erases their difference", () => {
  const drier = findWaterEpisode(water, "maize-soy-soy", "analog:1997/98", {
    ...settings,
    initial_water_fraction: 0.25,
  })
  const baseline = findWaterEpisode(
    water,
    "maize-soy-soy",
    "analog:1997/98",
    settings
  )
  assert.equal(drier?.run_id, "55fa071b76cb14d98bfa")
  assert.notEqual(drier?.run_id, baseline?.run_id)
  assert.equal(drier?.crop_et_deficit_mm, baseline?.crop_et_deficit_mm)
})

test("missing analog campaigns remain selectable but never borrow another campaign's run", () => {
  const campaigns = waterAnalogCampaigns(bundle.years_like_this.campaigns)
  assert.equal(campaigns.length, 7)
  assert.deepEqual(
    campaigns
      .filter(
        (campaign) => !hasWaterRuns(water, settings, campaign.scenario_id)
      )
      .map((campaign) => campaign.campaign),
    ["2023/24", "1982/83"]
  )
  for (const scenarioId of ["analog:2023/24", "analog:1982/83", null]) {
    assert.equal(
      findWaterEpisode(water, "maize-soy-soy", scenarioId, settings),
      undefined
    )
  }
})

test("unsupported strategy and setting combinations return no run instead of zero", () => {
  assert.equal(
    findWaterEpisode(water, "continuous-soy", "analog:1997/98", settings),
    undefined
  )
  const unsupported = { ...settings, depth_m: 0.6, summer_shift_days: 7 }
  assert.equal(hasWaterRuns(water, unsupported), false)
  assert.equal(
    findWaterEpisode(water, "maize-soy-soy", "analog:1997/98", unsupported),
    undefined
  )
})
