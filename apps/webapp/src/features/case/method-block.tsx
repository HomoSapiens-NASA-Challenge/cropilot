import type { CaseBundle } from "@cropilot/api"
import { BlockSection, Panel } from "@/features/case/block-frame"
import { CaseReferencesProvider } from "@/features/case/case-context"
import { formatDate } from "@/features/case/case-format"
import { EvidenceChip, SourceEntry } from "@/features/case/evidence-chip"
import { isCalculationReference } from "@/features/case/source-lineage"
import { useI18n } from "@/lib/i18n"

/** B5. What the case cannot say, where every number comes from and what the words mean. */
export function MethodBlock({
  bundle,
  id,
}: {
  bundle: CaseBundle
  id?: string
}) {
  const { t } = useI18n("case")
  const originalSources = bundle.sources.filter(
    (source) => !isCalculationReference(source.id)
  )
  const calculations = bundle.sources.filter((source) =>
    isCalculationReference(source.id)
  )

  return (
    <CaseReferencesProvider sources={bundle.sources} glossary={bundle.glossary}>
      <BlockSection
        id={id}
        title={t("Method and limits")}
        lead={t(
          "Read these before you trust a number. Cropilot supports the agronomist's judgment and the producer's decision. It does not replace them."
        )}
      >
        <div className="flex flex-col gap-3">
          <h3 className="font-medium">{t("Limits")}</h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {bundle.limits.map((limit) => (
              <li key={limit.title}>
                <Panel className="flex h-full flex-col gap-2">
                  <h4 className="font-medium">{t(limit.title)}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t(limit.text)}
                  </p>
                  <EvidenceChip
                    sourceIds={limit.source_ids}
                    className="mt-auto"
                  />
                </Panel>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-medium">{t("Original data and references")}</h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {originalSources.map((source) => (
              <SourceEntry
                key={source.id}
                source={source}
                className="rounded-xl border bg-card p-4 sm:p-5"
              />
            ))}
          </ul>
        </div>

        {calculations.length > 0 && (
          <details className="rounded-xl border bg-card p-4 sm:p-5">
            <summary className="cursor-pointer rounded-lg font-medium focus-visible:outline-2 focus-visible:outline-ring">
              {t("Calculations and method notes")}
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">
              {t(
                "Results computed from external inputs. The linked method explains how they were produced; they are not observations published by the data providers."
              )}
            </p>
            <ul className="mt-5 flex flex-col gap-5">
              {calculations.map((source) => (
                <SourceEntry key={source.id} source={source} />
              ))}
            </ul>
          </details>
        )}

        <div className="flex flex-col gap-3">
          <h3 className="font-medium">{t("Glossary")}</h3>
          <dl className="grid gap-x-8 gap-y-4 rounded-xl border bg-card p-4 sm:p-5 md:grid-cols-2">
            {bundle.glossary.map((entry) => (
              <div key={entry.term} className="flex flex-col gap-1">
                <dt className="font-medium">{t(entry.term)}</dt>
                <dd className="text-sm text-muted-foreground">
                  {t(entry.definition)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-xs text-muted-foreground">
          {t("Case built {value1}. Schema {value2}.", {
            value1: formatDate(bundle.generated_utc.slice(0, 10)),
            value2: bundle.schema_version,
          })}
        </p>
      </BlockSection>
    </CaseReferencesProvider>
  )
}
