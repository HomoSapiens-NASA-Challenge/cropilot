import { Band } from "@/features/landing/frame"

// Names only, set in type: no agency logos.
const OPEN_DATA_NAMES = [
  "NASA POWER",
  "MERRA-2",
  "NOAA Climate Prediction Center",
  "Oceanic Niño Index",
] as const

export function SourceStrip() {
  return (
    <Band frameClassName="border-y">
      <div className="grid items-center gap-x-8 gap-y-4 px-4 py-7 sm:px-6 lg:grid-cols-[auto_1fr]">
        <p className="text-sm text-muted-foreground">Built on open data from</p>
        <ul className="flex flex-wrap items-center gap-x-10 gap-y-3 lg:justify-between">
          {OPEN_DATA_NAMES.map((name) => (
            <li
              key={name}
              className="text-base font-medium tracking-tight text-foreground/70"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </Band>
  )
}
