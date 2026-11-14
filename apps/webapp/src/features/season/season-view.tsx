import type { SeasonDashboard } from "@cropilot/api"
import { useState } from "react"
import { Carbon } from "./carbon"
import { Climate } from "./climate"
import { SeasonSheet } from "./season-sheet"
import { SeasonStart } from "./season-start"
import { Strategies } from "./strategies"

export type SelectSeason = (seasonId: string, opener: HTMLElement) => void

/** The "This season" tab, in order of importance. Owns the season drill-down state. */
export function SeasonView({ data }: { data: SeasonDashboard }) {
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [opener, setOpener] = useState<HTMLElement | null>(null)
  const select: SelectSeason = (id, element) => {
    setOpener(element)
    setSeasonId(id)
  }

  return (
    <>
      <SeasonStart data={data} onSelectSeason={select} />
      <Strategies data={data} onSelectSeason={select} />
      <Climate data={data} />
      <Carbon data={data} />
      <SeasonSheet
        data={data}
        seasonId={seasonId}
        opener={opener}
        onClose={() => setSeasonId(null)}
      />
    </>
  )
}
