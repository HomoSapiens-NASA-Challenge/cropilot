import type { SeasonDashboard } from "@cropilot/api"
import { Link } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GLASS } from "./data"
import { plural } from "./format"
import { ProvenanceTag } from "./provenance-tag"

/** 4 · Soil: carbon each strategy returns to the soil, plus a pointer to what is missing. */
export function Carbon({ data }: { data: SeasonDashboard }) {
  const values = data.strategies
    .map((s) => s.carbon_input.value)
    .filter((v): v is number => v !== null)
  const max = Math.max(...values, 0)
  const first = data.strategies[0].carbon_input
  return (
    <Card className={GLASS}>
      <CardHeader>
        <CardTitle>
          <h2 className="inline text-base font-semibold">
            Carbon returned to the soil
          </h2>{" "}
          <ProvenanceTag {...first} />
        </CardTitle>
        <CardDescription>
          Crop residue per year, {first.unit}. An estimate, not a measured
          change in soil carbon.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ul className="flex flex-col gap-3">
          {data.strategies.map((s) => {
            const value = s.carbon_input.value
            return (
              <li
                key={s.strategy_id}
                className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 text-sm"
              >
                <span className="truncate text-muted-foreground" title={s.name}>
                  {s.name}
                </span>
                {value === null ? (
                  <span className="text-xs text-muted-foreground">Missing</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 rounded-full bg-(--viz-bar)"
                      style={{ width: `${max > 0 ? (value / max) * 75 : 0}%` }}
                      aria-hidden
                    />
                    <span className="font-medium tabular-nums">
                      {value.toFixed(1)}
                    </span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
        <p className="border-t border-foreground/8 pt-4 text-xs text-muted-foreground">
          {plural(data.missing_inputs.length, "input")} still missing and{" "}
          {plural(data.limits.length, "known limit")}.{" "}
          <Link
            to="/dashboard/evidence"
            className="font-medium text-foreground underline underline-offset-4"
          >
            See evidence
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
