import { Band } from "@/features/landing/frame"

// Facts about the method and its two sources, not results for any field.
const METHOD_FACTS = [
  {
    value: "2",
    label: "signals, both known when the decision is made",
  },
  {
    value: "1981",
    label: "first year of daily soil water in NASA POWER",
  },
  {
    value: "1950",
    label: "first year of the NOAA Oceanic Niño Index",
  },
  {
    value: "5",
    label: "rotations compared in the Pergamino case, the current one included",
  },
] as const

export function StatsSection() {
  return (
    <Band tone="tinted">
      <h2 className="mx-auto max-w-2xl px-4 py-20 text-center text-5xl leading-none font-light tracking-tighter text-balance sm:px-6 lg:py-24 lg:text-6xl">
        Real campaigns, not a forecast
      </h2>
      <dl className="relative grid border-y sm:grid-cols-2 lg:grid-cols-4">
        <span
          aria-hidden
          className="absolute -top-px left-1/4 h-px w-1/4 bg-linear-to-r from-transparent via-primary to-transparent"
        />
        {METHOD_FACTS.map((fact) => (
          <div
            key={fact.value}
            className="flex flex-col items-center gap-2 px-6 py-10 text-center"
          >
            <dd className="text-5xl font-light tracking-tighter">
              {fact.value}
            </dd>
            <dt className="max-w-48 text-muted-foreground">{fact.label}</dt>
          </div>
        ))}
      </dl>
      <div className="h-20" />
    </Band>
  )
}
