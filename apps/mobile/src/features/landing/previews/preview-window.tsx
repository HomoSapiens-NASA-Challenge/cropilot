import type { ReactNode } from "react"
import { View } from "react-native"
import { Badge } from "@/components/ui/badge"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"

/**
 * Window that frames an illustrative preview or a labelled measured result.
 */
export function PreviewWindow({
  title,
  badge = "Illustrative",
  className,
  children,
}: {
  title: string
  badge?: string
  className?: string
  children: ReactNode
}) {
  // The shadow sits on an outer view: on iOS `overflow-hidden` clips it.
  return (
    <View
      className={cn(
        "rounded-xl bg-background shadow-2xl shadow-foreground/15",
        className
      )}
    >
      <View className="overflow-hidden rounded-xl border border-background/80">
        <View className="flex-row items-center gap-3 border-b border-border/70 px-4 py-2.5">
          <View aria-hidden className="flex-row gap-1.5">
            <View className="size-2 rounded-full bg-border" />
            <View className="size-2 rounded-full bg-border" />
            <View className="size-2 rounded-full bg-border" />
          </View>
          <Text className="truncate text-xs text-muted-foreground">
            {title}
          </Text>
          <Badge variant="outline" className="ml-auto bg-background/60">
            <Text>{badge}</Text>
          </Badge>
        </View>
        <View className="p-4">{children}</View>
      </View>
    </View>
  )
}

/** Stands in for a value or a sentence that the preview does not make up. */
export function PlaceholderLine({ className }: { className?: string }) {
  return (
    <View aria-hidden className={cn("h-2 rounded-full bg-border", className)} />
  )
}
