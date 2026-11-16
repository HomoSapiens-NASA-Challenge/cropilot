import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CtaLink } from "@/features/landing/cta-link"
import { Band, SplitHeading } from "@/features/landing/frame"
import { Recording, type RecordingId } from "@/features/landing/recording"
import { useI18n } from "@/lib/i18n"
import { REFERENCE_CASE_ZONE_ID } from "@/lib/reference-case"

const TOUR_STOPS: ReadonlyArray<{
  id: RecordingId
  tab: string
  title: string
  description: string
}> = [
  {
    id: "years-like-this",
    tab: "Years like this",
    title: "The campaigns that started like 2026/27",
    description:
      "Past campaigns picked by El Niño index and soil water at the start, each one named and dated. They are scenarios from the record, not a forecast.",
  },
  {
    id: "compare",
    tab: "Compare",
    title: "Rotation strategies with their water runs",
    description:
      "Compare the current rotation with the alternatives, and change the starting water, the depth and the sowing shift to see how the water runs move.",
  },
  {
    id: "field-map",
    tab: "Field",
    title: "The crop-map lots of the zone",
    description:
      "Pergamino and Paraná lots with the crop of each campaign, from INTA maps and the team model. The farm “La Celina” in Pergamino is made up.",
  },
  {
    id: "planner",
    tab: "Rotation planner",
    title: "A live run on NASA POWER weather",
    description:
      "A three-step wizard sets up the run. The planner then solves the exact optimum, trains five Q-learning agents and replays every policy on held-out campaigns.",
  },
]

function TourLink({
  id,
  isSignedIn,
}: {
  id: RecordingId
  isSignedIn: boolean
}) {
  const { t } = useI18n("landing")
  if (id === "planner") {
    return (
      <CtaLink
        to={isSignedIn ? "/planner" : "/login"}
        variant="outline"
        withChevron
      >
        {t(isSignedIn ? "Open the planner" : "Sign in to run the planner")}
      </CtaLink>
    )
  }
  return (
    <CtaLink
      to="/case/$zoneId"
      params={{ zoneId: REFERENCE_CASE_ZONE_ID }}
      variant="outline"
      withChevron
    >
      {t("Open the public case")}
    </CtaLink>
  )
}

export function ProductTourSection({ isSignedIn }: { isSignedIn: boolean }) {
  const { t } = useI18n("landing")
  return (
    <Band id="tour" className="scroll-mt-18">
      <div className="flex flex-col gap-10 px-4 py-20 sm:px-6 lg:py-24">
        <SplitHeading lead={t("See the running app.")} className="max-w-3xl">
          {t(
            "Four screen recordings of Cropilot as it runs today. The case is public and needs no sign-in; the planner needs an account."
          )}
        </SplitHeading>
        <Tabs defaultValue={TOUR_STOPS[0].id} className="gap-8">
          <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
            {TOUR_STOPS.map((stop) => (
              <TabsTrigger
                key={stop.id}
                value={stop.id}
                className="h-9 flex-none px-4"
              >
                {t(stop.tab)}
              </TabsTrigger>
            ))}
          </TabsList>
          {TOUR_STOPS.map((stop) => (
            <TabsContent
              key={stop.id}
              value={stop.id}
              className="grid items-start gap-8 text-base lg:grid-cols-[1fr_2fr] lg:gap-12"
            >
              <div className="flex flex-col items-start gap-4">
                <h3 className="text-2xl/8 font-light tracking-tight text-balance">
                  {t(stop.title)}
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  {t(stop.description)}
                </p>
                <div className="mt-2">
                  <TourLink id={stop.id} isSignedIn={isSignedIn} />
                </div>
              </div>
              <Recording id={stop.id} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Band>
  )
}
