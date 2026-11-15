import { Text } from "@/components/ui/text"

export function SourceNote({ children }: { children: string }) {
  return (
    <Text className="text-xs text-muted-foreground">Source: {children}</Text>
  )
}
