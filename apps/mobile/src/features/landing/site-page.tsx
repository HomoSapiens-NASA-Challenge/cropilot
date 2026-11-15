import { PencilLine } from "lucide-react-native"
import { View } from "react-native"
import { StrandsArt } from "@/components/strands-art"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { ClosingSection } from "@/features/landing/closing-section"
import { AppEntryLink, ArrowLink } from "@/features/landing/cta-link"
import { Band, SplitHeading } from "@/features/landing/frame"
import { SitePreview } from "@/features/landing/previews/site-preview"
import type {
  SiteMenu,
  SitePage,
  SitePageContent,
} from "@/features/landing/site-content"
import { openSitePage } from "@/features/landing/site-links"

type SiteMenuColumn = SiteMenu["columns"][number]

function PageContent({ content }: { content: SitePageContent }) {
  return (
    <>
      <Band tone="tinted" className="relative overflow-hidden">
        <StrandsArt className="absolute inset-0 size-full" />
        <View className="px-4 py-16">
          <SitePreview id={content.preview} className="w-full" />
        </View>
      </Band>
      <Band frameClassName="border-t">
        {content.highlights.map((highlight) => (
          <View key={highlight.title} className="gap-3 px-4 py-10">
            <View className="size-10 items-center justify-center rounded-lg border border-border bg-background">
              <Icon as={highlight.icon} className="text-primary" size={20} />
            </View>
            <Text className="mt-2 text-lg font-medium">{highlight.title}</Text>
            <Text className="leading-relaxed text-muted-foreground">
              {highlight.description}
            </Text>
          </View>
        ))}
      </Band>
      <Band frameClassName="border-t">
        <View className="gap-10 px-4 py-20">
          <Text className="text-3xl font-light tracking-tight">
            {content.details.title}
          </Text>
          <View className="border-b border-dashed border-border">
            {content.details.rows.map((row) => (
              <View
                key={row.title}
                className="gap-1 border-t border-dashed border-border py-5"
              >
                <Text className="text-xl font-light tracking-tight">
                  {row.title}
                </Text>
                <Text className="text-muted-foreground">{row.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </Band>
      {content.sources && (
        <Band tone="inverse">
          <View className="gap-10 px-4 py-20">
            <SplitHeading tone="inverse" lead="Where it comes from.">
              Dataset, period and location of everything this page describes.
            </SplitHeading>
            <View className="gap-4">
              {content.sources.map((source) => (
                <View
                  key={source.dataset}
                  className="gap-4 rounded-xl border border-inverse-foreground/10 bg-inverse-foreground/5 p-6"
                >
                  <Text className="text-lg font-medium text-inverse-foreground">
                    {source.dataset}
                  </Text>
                  <View className="gap-2">
                    <View className="flex-row gap-4">
                      <Text className="w-20 text-sm text-inverse-muted-foreground">
                        Period
                      </Text>
                      <Text className="flex-1 text-sm text-inverse-foreground">
                        {source.period}
                      </Text>
                    </View>
                    <View className="flex-row gap-4">
                      <Text className="w-20 text-sm text-inverse-muted-foreground">
                        Location
                      </Text>
                      <Text className="flex-1 text-sm text-inverse-foreground">
                        {source.location}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Band>
      )}
    </>
  )
}

function PagePlaceholder({ page }: { page: SitePage }) {
  return (
    <Band tone="tinted">
      <View className="px-4 py-16">
        <View className="items-center gap-4 rounded-xl border border-dashed border-border bg-background/70 px-6 py-14">
          <View className="size-10 items-center justify-center rounded-lg border border-border bg-background">
            <Icon as={PencilLine} className="text-primary" size={20} />
          </View>
          <Text className="text-center text-2xl font-light tracking-tight">
            {page.isRoadmap
              ? "Not in this version"
              : "This page is being written"}
          </Text>
          <Text className="text-center text-muted-foreground">
            {page.isRoadmap
              ? "This is on the roadmap. Cropilot does not do it today, and this page will describe it once it ships."
              : page.isInDevelopment
                ? "This part of Cropilot is in development. The page will describe it once it is in the app, with its data sources."
                : "The content of this page is on its way."}
          </Text>
        </View>
      </View>
    </Band>
  )
}

export function SitePageView({
  menu,
  column,
  page,
}: {
  menu: SiteMenu
  column: SiteMenuColumn
  page: SitePage
}) {
  const relatedPages = column.pages.filter(
    (entry) => entry.pageSlug !== page.pageSlug
  )
  return (
    <>
      <Band>
        <View className="items-start gap-8 px-4 pb-16 pt-20">
          <View className="flex-row flex-wrap items-center gap-3">
            <Text className="text-sm">
              <Text className="font-medium">{menu.label}</Text>
              <Text className="text-muted-foreground"> · {column.heading}</Text>
            </Text>
            {page.isRoadmap && (
              <Badge variant="outline">
                <Text>Roadmap · not in this version</Text>
              </Badge>
            )}
            {page.isInDevelopment && (
              <Badge variant="outline">
                <Text>In development</Text>
              </Badge>
            )}
          </View>
          <View className="gap-6">
            <Text className="text-3xl font-light tracking-tight">
              {page.content?.headline ?? page.title}
            </Text>
            <Text className="text-xl font-light leading-8 text-muted-foreground">
              {page.content?.lead ?? page.summary}
            </Text>
          </View>
          <AppEntryLink signedOutLabel="Get started" />
        </View>
      </Band>
      {page.content ? (
        <PageContent content={page.content} />
      ) : (
        <PagePlaceholder page={page} />
      )}
      {relatedPages.length > 0 && (
        <Band frameClassName="border-t">
          <View className="gap-8 px-4 py-16">
            <Text className="text-sm text-muted-foreground">
              More in {column.heading}
            </Text>
            <View className="gap-4">
              {relatedPages.map((related) => (
                <View
                  key={related.pageSlug}
                  className="items-start gap-2 rounded-xl border border-border p-5"
                >
                  <Text className="font-medium">{related.title}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {related.summary}
                  </Text>
                  <ArrowLink
                    label="Open"
                    onPress={() =>
                      openSitePage(menu.sectionSlug, related.pageSlug)
                    }
                    className="pt-2"
                  />
                </View>
              ))}
            </View>
          </View>
        </Band>
      )}
      <ClosingSection />
    </>
  )
}
