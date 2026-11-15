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

/** B5. What the case cannot say, where every number comes from and what the words mean. */
export function MethodBlock({
  bundle,
  id,
}: {
  bundle: CaseBundle
  id?: string
}) {
  return (
    <CaseReferencesProvider sources={bundle.sources} glossary={bundle.glossary}>
      <BlockSection
        id={id}
        title="Method and limits"
        lead="Read these before you trust a number. Cropilot supports the agronomist's judgment and the producer's decision. It does not replace them."
      >
        <div className="flex flex-col gap-3">
          <h3 className="font-medium">Limits</h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {bundle.limits.map((limit) => (
              <li key={limit.title}>
                <Panel className="flex h-full flex-col gap-2">
                  <h4 className="font-medium">{limit.title}</h4>
                  <p className="text-sm text-muted-foreground">{limit.text}</p>
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
          <h3 className="font-medium">Sources</h3>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead className="w-12">Link</TableHead>
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
                      {source.period}
                    </TableCell>
                    <TableCell className="min-w-40 whitespace-normal">
                      {source.location}
                    </TableCell>
                    <TableCell className="min-w-24 whitespace-normal">
                      {source.license ?? "Not stated"}
                    </TableCell>
                    <TableCell>
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${source.dataset}`}
                          className="inline-flex size-7 items-center justify-center rounded-lg text-primary outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-medium">Glossary</h3>
          <dl className="grid gap-x-8 gap-y-4 rounded-xl border bg-card p-4 sm:p-5 md:grid-cols-2">
            {bundle.glossary.map((entry) => (
              <div key={entry.term} className="flex flex-col gap-1">
                <dt className="font-medium">{entry.term}</dt>
                <dd className="text-sm text-muted-foreground">
                  {entry.definition}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-xs text-muted-foreground">
          Case built {formatDate(bundle.generated_utc.slice(0, 10))}. Schema{" "}
          {bundle.schema_version}.
        </p>
      </BlockSection>
    </CaseReferencesProvider>
  )
}
