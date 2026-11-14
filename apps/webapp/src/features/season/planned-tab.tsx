import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GLASS } from "./data"
import { TABS, type TabPath } from "./tabs"

/** Placeholder for a tab whose models are not wired yet: says what feeds it and its status. */
export function PlannedTab({ path }: { path: TabPath }) {
  const tab = TABS.find((t) => t.to === path)
  if (!tab) {
    throw new Error(`No tab for ${path}`)
  }
  return (
    <Card className={GLASS}>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-semibold">{tab.label}</h2>
        </CardTitle>
        <CardDescription>{tab.question}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="w-fit rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-900 dark:text-amber-200">
          Not connected yet{tab.bundle ? ` · waits for ${tab.bundle}` : ""}
        </p>
        <ul className="flex flex-col divide-y divide-foreground/8">
          {tab.feeds?.map((feed) => (
            <li
              key={feed.model}
              className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:gap-4"
            >
              <div className="min-w-0">
                <h3 className="font-medium">{feed.model}</h3>
                <p className="text-sm text-muted-foreground">{feed.output}</p>
              </div>
              <div className="text-xs text-muted-foreground sm:text-right">
                <p className="font-medium text-foreground">{feed.owner}</p>
                <p>{feed.status}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
