import type { ReactNode } from "react"
import { Band } from "@/features/landing/frame"
import { useI18n } from "@/lib/i18n"

type OpenDataSource = {
  name: string
  /** Drawn on a 32 × 32 grid, stroked in the text color. */
  glyph: ReactNode
  wordmark: (t: (text: string) => string) => ReactNode
}

// Our own marks, drawn for this strip. No agency logos or insignia: their use
// needs the agency's permission and would read as an endorsement.
const OPEN_DATA_SOURCES: ReadonlyArray<OpenDataSource> = [
  {
    name: "NASA POWER",
    // The sun over the soil layers: POWER is where the soil water comes from.
    glyph: (
      <>
        <circle cx="16" cy="13" r="4" className="fill-primary stroke-none" />
        <path d="M6 13H8.5M8.9 5.9L10.7 7.7M16 3V5.5M23.1 5.9L21.3 7.7M26 13H23.5" />
        <path d="M4 20H28M8 24H24M12 28H20" />
      </>
    ),
    wordmark: () => (
      <span className="text-sm font-medium tracking-widest uppercase">
        NASA POWER
      </span>
    ),
  },
  {
    name: "MERRA-2",
    // A gridded globe with one cell lit: the reanalysis is read cell by cell.
    glyph: (
      <>
        <circle cx="16" cy="16" r="11" />
        <ellipse cx="16" cy="16" rx="4.5" ry="11" />
        <path d="M16 5V27M5.75 12H26.25M5.75 20H26.25" />
        <path
          d="M16 12H20.2A4.5 11 0 0 1 20.2 20H16Z"
          className="fill-primary stroke-none"
        />
      </>
    ),
    wordmark: () => (
      <span className="text-2xl font-light tracking-tight">MERRA-2</span>
    ),
  },
  {
    name: "NOAA Climate Prediction Center",
    // A dial: the center that monitors and forecasts the climate.
    glyph: (
      <>
        <path d="M5 22A11 11 0 0 1 27 22" />
        <path d="M8.2 14.2L10.3 16.3M16 11V14M23.8 14.2L21.7 16.3" />
        <path d="M16 22L21 16" strokeWidth={2} className="stroke-primary" />
        <circle cx="16" cy="22" r="1.75" className="fill-current stroke-none" />
        <path d="M4 26H28" />
      </>
    ),
    wordmark: (t) => (
      <span className="flex flex-col">
        <span className="text-lg/none font-medium tracking-tight">NOAA</span>
        <span className="mt-1 text-xs/none text-muted-foreground">
          {t("Climate Prediction Center")}
        </span>
      </span>
    ),
  },
  {
    name: "Oceanic Niño Index",
    // The index swinging above and below zero, with the warm phase lit.
    glyph: (
      <>
        <path
          d="M3 16C5.5 5 10 5 12.5 16Z"
          className="fill-primary/25 stroke-none"
        />
        <path d="M3 16H29" className="opacity-40" />
        <path d="M12.5 16C15 27 19.5 27 22 16C23.75 9 27.25 9 29 16" />
        <path d="M3 16C5.5 5 10 5 12.5 16" className="stroke-primary" />
      </>
    ),
    wordmark: (t) => (
      <span className="flex flex-col">
        <span className="text-2xl/none font-light tracking-tight">ONI</span>
        <span className="mt-1 text-xs/none text-muted-foreground">
          {t("Oceanic Niño Index")}
        </span>
      </span>
    ),
  },
]

// Each track holds the sources twice so that one track is wider than the
// widest frame; two tracks in a row then loop without a gap.
const TRACK = [...OPEN_DATA_SOURCES, ...OPEN_DATA_SOURCES]

function SourceMark({ source }: { source: OpenDataSource }) {
  const { t } = useI18n("landing")
  return (
    <div className="flex shrink-0 items-center gap-3 text-foreground/75">
      <svg
        aria-hidden
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-9 shrink-0"
      >
        {source.glyph}
      </svg>
      {source.wordmark(t)}
    </div>
  )
}

export function SourceStrip() {
  const { t } = useI18n("landing")
  return (
    <Band frameClassName="border-y">
      <div className="grid items-center gap-x-8 gap-y-5 px-4 py-7 sm:px-6 lg:grid-cols-[auto_1fr]">
        <p className="text-sm text-muted-foreground">
          {t("Built on open data from")}
        </p>
        <ul className="sr-only">
          {OPEN_DATA_SOURCES.map((source) => (
            <li key={source.name}>{t(source.name)}</li>
          ))}
        </ul>
        {/* Decorative loop of the list above. It pauses under the pointer and
            stands still for readers who ask for reduced motion. */}
        <div aria-hidden className="group flex overflow-hidden mask-x-from-85%">
          {[0, 1].map((track) => (
            <div
              key={track}
              className="flex shrink-0 items-center gap-16 pr-16 motion-safe:animate-marquee group-hover:[animation-play-state:paused]"
            >
              {TRACK.map((source, index) => (
                <SourceMark key={`${source.name}-${index}`} source={source} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Band>
  )
}
