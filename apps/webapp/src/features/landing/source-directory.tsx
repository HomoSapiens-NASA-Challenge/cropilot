import { ArrowUpRight } from "lucide-react"
import { Band } from "@/features/landing/frame"
import type { SitePageContent } from "@/features/landing/site-content"
import { useI18n } from "@/lib/i18n"

export function SourceDirectory({
  groups,
}: {
  groups: NonNullable<SitePageContent["sourceGroups"]>
}) {
  const { t } = useI18n("landing")

  return (
    <Band frameClassName="border-t">
      <div
        id="source-directory"
        className="scroll-mt-28 px-4 py-12 sm:px-6 lg:py-16"
      >
        <nav
          aria-label={t("Source categories")}
          className="mb-12 flex flex-wrap gap-2"
        >
          {groups.map((group) => (
            <a
              key={group.id}
              href={`#sources-${group.id}`}
              className="rounded-lg border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t(group.title)}
            </a>
          ))}
        </nav>
        <div className="flex flex-col gap-16">
          {groups.map((group) => (
            <section
              key={group.id}
              id={`sources-${group.id}`}
              aria-labelledby={`sources-${group.id}-title`}
              className="grid scroll-mt-28 gap-6 lg:grid-cols-[15rem_1fr] lg:gap-12"
            >
              <div className="flex flex-col items-start gap-3">
                <group.icon className="size-5 text-primary" aria-hidden />
                <h2
                  id={`sources-${group.id}-title`}
                  className="text-2xl font-light tracking-tight"
                >
                  {t(group.title)}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(group.description)}
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {group.sources.map((source) => (
                  <li
                    key={source.href}
                    className="flex min-w-0 flex-col gap-4 rounded-xl border bg-background p-5 sm:p-6"
                  >
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">
                        {t(source.provider)}
                      </p>
                      <h3 className="text-lg font-medium">{t(source.name)}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t(source.description)}
                    </p>
                    <dl className="mt-auto flex flex-col gap-3 border-t pt-4 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t("Period used")}
                        </dt>
                        <dd className="mt-1">{t(source.period)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t("Coverage in Cropilot")}
                        </dt>
                        <dd className="mt-1">{t(source.coverage)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t("Recorded terms")}
                        </dt>
                        <dd className="mt-1">
                          {t(
                            source.terms ?? "Not stated in the project register"
                          )}
                        </dd>
                      </div>
                    </dl>
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t("Open original source: {name}", {
                        name: t(source.name),
                      })}
                      className="inline-flex items-center gap-2 self-start rounded-lg text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {t("Original source")}
                      <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-12 max-w-3xl border-t pt-6 text-sm leading-relaxed text-muted-foreground">
          {t(
            "Periods and coverage describe the inputs used by Cropilot, not the full archive of each provider. Each case keeps the source attached to its figures. Terms are transcribed from the project register; a missing entry does not imply permission to reuse data."
          )}
        </p>
      </div>
    </Band>
  )
}
