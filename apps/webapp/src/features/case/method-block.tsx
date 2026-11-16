import type { CaseBundle } from "@cropilot/api"
import { ExternalLink } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { BlockSection, Panel } from "@/features/case/block-frame"
import { CaseReferencesProvider } from "@/features/case/case-context"
import { formatDate } from "@/features/case/case-format"
import { EvidenceChip } from "@/features/case/evidence-chip"
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
          <h3 className="font-medium">{t("Sources")}</h3>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Dataset")}</TableHead>
                  <TableHead>{t("Provider")}</TableHead>
                  <TableHead>{t("Period")}</TableHead>
                  <TableHead>{t("Location")}</TableHead>
                  <TableHead>{t("License")}</TableHead>
                  <TableHead className="w-12">{t("Link")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundle.sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="min-w-48 font-medium whitespace-normal">
                      {source.dataset}
                    </TableCell>
                    <TableCell className="min-w-32 whitespace-normal">
                      {source.provider}
                    </TableCell>
                    <TableCell className="min-w-32 whitespace-normal">
                      {t(source.period)}
                    </TableCell>
                    <TableCell className="min-w-40 whitespace-normal">
                      {t(source.location)}
                    </TableCell>
                    <TableCell className="min-w-24 whitespace-normal">
                      {t(source.license ?? "Not stated")}
                    </TableCell>
                    <TableCell>
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t("Open {value1}", {
                            value1: source.dataset,
                          })}
                          className="inline-flex size-7 items-center justify-center rounded-lg text-primary outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("None")}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

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
