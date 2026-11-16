import { listFarmsOptions } from "@cropilot/api"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useI18n } from "@/lib/i18n"

export function FarmList() {
  const { t } = useI18n("app")

  const { data: farms } = useSuspenseQuery(listFarmsOptions())

  if (farms.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("No farms yet.")}</p>
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
