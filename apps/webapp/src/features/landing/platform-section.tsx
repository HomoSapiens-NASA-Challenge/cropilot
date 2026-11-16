import { type LucideIcon, Mic, Plug, Smartphone } from "lucide-react"
import { ArrowLink } from "@/features/landing/cta-link"
import { Band, SplitHeading } from "@/features/landing/frame"
import { useI18n } from "@/lib/i18n"

const CHANNELS: ReadonlyArray<{
  icon: LucideIcon
  title: string
  description: string
  link?: { sectionSlug: string; pageSlug: string; label: string }
}> = [
  {
    icon: Mic,
    title: "Ask Cropilot, by text or by voice",
    description:
      "A contextual assistant explains the evidence of the case or the planner run you are looking at, with its sources. Type a question or record one. It explains evidence; it never makes the call.",
    link: {
      sectionSlug: "features",
      pageSlug: "assistant",
      label: "Assistant",
    },
  },
  {
    icon: Plug,
    title: "Open to your own AI client",
    description:
      "A public, read-only MCP server at /api/mcp offers four tools: list cases, find analog years, compare rotations and get the evidence of a field. It also serves an interactive rotation card.",
    link: {
      sectionSlug: "features",
      pageSlug: "mcp-tools",
      label: "MCP tools",
    },
  },
  {
    icon: Smartphone,
    title: "A mobile companion",
    description:
      "The Expo app reads the same public case, so the evidence an agronomist reviews at the desk is the one carried to the field.",
  },
]

export function PlatformSection() {
  const { t } = useI18n("landing")
  return (
    <Band tone="tinted" frameClassName="border-t">
      <div className="flex flex-col gap-12 px-4 py-20 sm:px-6 lg:py-24">
        <SplitHeading
          lead={t("The same evidence, wherever the advisor works.")}
          className="max-w-3xl"
        >
          {t(
            "Ask about it, connect it to your own tools, or carry it to the field. Every answer keeps its sources, its dates and its limits."
          )}
        </SplitHeading>
        <ul className="grid gap-10 md:grid-cols-3">
          {CHANNELS.map((channel) => (
            <li key={channel.title} className="flex flex-col items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border bg-background text-primary">
                <channel.icon className="size-5" />
              </span>
              <h3 className="mt-2 text-lg font-medium">{t(channel.title)}</h3>
              <p className="leading-relaxed text-muted-foreground">
                {t(channel.description)}
              </p>
              {channel.link && (
                <ArrowLink
                  to="/$sectionSlug/$pageSlug"
                  params={{
                    sectionSlug: channel.link.sectionSlug,
                    pageSlug: channel.link.pageSlug,
                  }}
                >
                  {t(channel.link.label)}
                </ArrowLink>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Band>
  )
}
