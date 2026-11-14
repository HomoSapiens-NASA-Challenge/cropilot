import type { SeasonDashboard } from "@cropilot/api"
import { ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { FOCUS, GLASS } from "./data"
import { MODEL_CARDS } from "./tabs"

const LIST =
  "flex list-disc flex-col gap-1.5 pl-4 text-sm marker:text-muted-foreground/60"

/** Where each number comes from, how each model was checked, and what is missing. */
export function Evidence({ data }: { data: SeasonDashboard }) {
  return (
    <>
      <div className="grid items-start gap-6 md:grid-cols-2">
        <Section title="Still missing">
          <ul className={LIST}>
            {data.missing_inputs.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
        <Section title="Known limits">
          <ul className={LIST}>
            {[...data.limits, data.field.scale_note].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Models and how they were checked">
        <ul className="flex flex-col divide-y divide-foreground/8">
          {MODEL_CARDS.map((model) => (
            <li
              key={model.name}
              className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-6"
            >
              <div>
                <h3 className="font-medium">{model.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {model.owner} ·{" "}
                  {model.status === "used" ? "used here" : "research only"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">{model.result}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Sources">
        <ul className="flex flex-col gap-3 text-sm">
          {data.sources.map((source) => (
            <li
              key={source.id}
              className="leading-snug [overflow-wrap:anywhere]"
            >
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded font-medium underline-offset-4 hover:underline",
                    FOCUS
                  )}
                >
                  {source.name}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <span className="font-medium">{source.name}</span>
              )}
              <span className="text-muted-foreground"> · {source.what}</span>
              {(source.period || source.location) && (
                <span className="block text-xs text-muted-foreground">
                  {[source.period, source.location].filter(Boolean).join(" · ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className={GLASS}>
      <CardHeader>
        <CardTitle>
          <h2 className="text-base font-semibold">{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
