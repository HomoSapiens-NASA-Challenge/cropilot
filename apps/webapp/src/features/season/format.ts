import type { EnsoPhase } from "./data"

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

/** "$310" / "−$40". null renders as an em dash, never as $0. */
export function usd(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—"
  const r = Math.round(v)
  return usdFmt.format(r === 0 ? 0 : r).replace("-", "−")
}

/** Signed with a true minus, and no "−0.00". */
export function signed(v: number, digits = 2): string {
  const r = Number(v.toFixed(digits))
  if (r === 0) return (0).toFixed(digits)
  return r > 0 ? `+${r.toFixed(digits)}` : `−${Math.abs(r).toFixed(digits)}`
}

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

export const ENSO_LABEL: Record<EnsoPhase, string> = {
  nino: "El Niño",
  nina: "La Niña",
  neutral: "Neutral",
}

export function ensoHeadline(
  phase: EnsoPhase,
  strength: "weak" | "moderate" | "strong" | null
): string {
  if (phase === "neutral") return "Neutral ocean"
  const s = strength ? `${strength[0].toUpperCase()}${strength.slice(1)} ` : ""
  return `${s}${ENSO_LABEL[phase]}`
}

export function longDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}
