import { Check } from "lucide-react"
import { Band, SplitHeading } from "@/features/landing/frame"

const STRATEGY_ANSWERS = [
  "Why it is suggested",
  "The evidence behind it",
  "The benefits it brings",
  "What information is missing",
  "Which risks need local review",
] as const

export function AgronomistSection() {
  return (
    <Band id="agronomists" className="scroll-mt-18">
      <div className="grid gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-24 lg:py-24">
        <div className="flex flex-col gap-6">
          <SplitHeading lead="Supports your judgment. Never replaces it.">
            Cropilot is for the agronomist who advises the farm. It brings the
            evidence from Earth observation; you bring local knowledge and make
            the call with the producer.
          </SplitHeading>
          <p className="text-muted-foreground">
            No remote sensing background needed.
          </p>
        </div>
        <div>
          <h3 className="pb-4 text-sm text-muted-foreground">
            Every strategy answers
          </h3>
          <ul className="border-b border-dashed">
            {STRATEGY_ANSWERS.map((answer) => (
              <li
                key={answer}
                className="flex items-center gap-4 border-t border-dashed py-4 text-xl font-light tracking-tight"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <Check className="size-4" />
                </span>
                {answer}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Band>
  )
}
