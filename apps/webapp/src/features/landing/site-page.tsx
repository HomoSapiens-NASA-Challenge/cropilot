import { PencilLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ClosingSection } from "@/features/landing/closing-section"
import { AppEntryLink, ArrowLink } from "@/features/landing/cta-link"
import { Band, SplitHeading } from "@/features/landing/frame"
import { SitePreview } from "@/features/landing/previews/site-preview"
import type {
  SiteMenu,
  SitePage,
  SitePageContent,
} from "@/features/landing/site-content"
import { StrandsArt } from "@/features/landing/strands-art"

type SiteMenuColumn = SiteMenu["columns"][number]

function PageContent({ content }: { content: SitePageContent }) {
  return (
    <>
      <Band tone="tinted" className="relative isolate overflow-hidden">
        <StrandsArt className="absolute inset-0 -z-10 size-full" />
        <div className="px-4 py-16 sm:px-6 lg:py-20">
          <SitePreview id={content.preview} className="mx-auto max-w-2xl" />
        </div>
      </Band>
      <Band frameClassName="border-t">
        <ul className="grid md:grid-cols-3 md:divide-x">
          {content.highlights.map((highlight) => (
            <li
              key={highlight.title}
              className="flex flex-col gap-3 px-4 py-10 sm:px-6 lg:py-14"
            >
              <span className="flex size-10 items-center justify-center rounded-lg border bg-background text-primary">
                <highlight.icon className="size-5" />
              </span>
              <h2 className="mt-2 text-lg font-medium">{highlight.title}</h2>
              <p className="leading-relaxed text-muted-foreground">
                {highlight.description}
              </p>
            </li>
          ))}
        </ul>
      </Band>
      <Band frameClassName="border-t">
        <div className="grid gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-24 lg:py-24">
          <h2 className="text-3xl/9 font-light tracking-tight">
            {content.details.title}
          </h2>
          <dl className="border-b border-dashed">
            {content.details.rows.map((row) => (
              <div
                key={row.title}
                className="flex flex-col gap-1 border-t border-dashed py-5"
              >
                <dt className="text-xl font-light tracking-tight">
                  {row.title}
                </dt>
                <dd className="text-muted-foreground">{row.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Band>
      {content.sources && (
        <Band tone="inverse">
          <div className="flex flex-col gap-10 px-4 py-20 sm:px-6 lg:py-24">
            <SplitHeading
              tone="inverse"
              lead="Where it comes from."
              className="max-w-3xl"
            >
              Dataset, period and location of everything this page describes.
            </SplitHeading>
            <ul className="grid gap-4 md:grid-cols-2">
              {content.sources.map((source) => (
                <li
                  key={source.dataset}
                  className="flex flex-col gap-4 rounded-xl border border-inverse-foreground/10 bg-inverse-foreground/5 p-6"
                >
                  <h3 className="text-lg font-medium">{source.dataset}</h3>
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex gap-4">
                      <dt className="w-20 shrink-0 text-inverse-muted-foreground">
                        Period
                      </dt>
                      <dd>{source.period}</dd>
                    </div>
                    <div className="flex gap-4">
                      <dt className="w-20 shrink-0 text-inverse-muted-foreground">
                        Location
                      </dt>
                      <dd>{source.location}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        </Band>
      )}
    </>
  )
}

/** Shown while a page of the catalog has no content yet. */
function PagePlaceholder({ page }: { page: SitePage }) {
  return (
    <Band tone="tinted">
      <div className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-xl border border-dashed bg-background/70 px-6 py-14 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg border bg-background text-primary">
            <PencilLine className="size-5" />
          </span>
          <h2 className="text-2xl font-light tracking-tight">
            This page is being written
          </h2>
          <p className="max-w-md text-muted-foreground">
            {page.isInDevelopment
              ? "This part of Cropilot is in development. The page will describe it once it is in the app, with its data sources."
              : "The content of this page is on its way."}
          </p>
        </div>
      </div>
    </Band>
  )
}

/** A page of the public site catalog, with content or as a placeholder. */
export function SitePageView({
  menu,
  column,
  page,
  isSignedIn,
}: {
  menu: SiteMenu
  column: SiteMenuColumn
  page: SitePage
  isSignedIn: boolean
}) {
  const relatedPages = column.pages.filter(
    (entry) => entry.pageSlug !== page.pageSlug
  )

  return (
    <>
      <Band>
        <div className="flex flex-col items-start gap-8 px-4 pt-20 pb-16 sm:px-6 lg:px-30 lg:pt-28 lg:pb-20">
          <p className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              <span className="font-medium">{menu.label}</span>{" "}
              <span className="text-muted-foreground">· {column.heading}</span>
            </span>
            {page.isInDevelopment && (
              <Badge variant="outline">In development</Badge>
            )}
          </p>
          <div className="flex max-w-3xl flex-col gap-6">
            <h1 className="text-3xl/9 font-light tracking-tight text-balance sm:text-5xl/14">
              {page.content?.headline ?? page.title}
            </h1>
            <p className="text-xl/8 font-light text-muted-foreground">
              {page.content?.lead ?? page.summary}
            </p>
          </div>
          <AppEntryLink isSignedIn={isSignedIn} signedOutLabel="Get started" />
        </div>
      </Band>
      {page.content ? (
        <PageContent content={page.content} />
      ) : (
        <PagePlaceholder page={page} />
      )}
      {relatedPages.length > 0 && (
        <Band frameClassName="border-t">
          <div className="flex flex-col gap-8 px-4 py-16 sm:px-6">
            <h2 className="text-sm text-muted-foreground">
              More in {column.heading}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedPages.map((related) => (
                <li
                  key={related.pageSlug}
                  className="flex flex-col items-start gap-2 rounded-xl border p-5"
                >
                  <h3 className="font-medium">{related.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {related.summary}
                  </p>
                  <ArrowLink
                    to="/$sectionSlug/$pageSlug"
                    params={{
                      sectionSlug: menu.sectionSlug,
                      pageSlug: related.pageSlug,
                    }}
                    className="mt-auto pt-2 text-sm"
                  >
                    Open
                  </ArrowLink>
                </li>
              ))}
            </ul>
          </div>
        </Band>
      )}
      <ClosingSection isSignedIn={isSignedIn} />
    </>
  )
}
