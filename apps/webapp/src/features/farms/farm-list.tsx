import { listFarmsOptions } from "@cropilot/api"
import { useSuspenseQuery } from "@tanstack/react-query"

export function FarmList() {
  const { data: farms } = useSuspenseQuery(listFarmsOptions())

  if (farms.length === 0) {
    return <p className="text-sm text-muted-foreground">No farms yet.</p>
  }

  return (
    <ul className="divide-y rounded-lg border">
      {farms.map((farm) => (
        <li key={farm.id} className="px-4 py-3 text-sm">
          {farm.name}
        </li>
      ))}
    </ul>
  )
}
