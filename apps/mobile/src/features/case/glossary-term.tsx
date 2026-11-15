import { CircleHelp } from "lucide-react-native"
import { type ReactNode, useState } from "react"
import { Pressable, View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Sheet } from "@/components/ui/sheet"
import { Text } from "@/components/ui/text"
import { useGlossaryEntry } from "@/features/case/evidence-chip"

export function Term({
  term,
  children,
}: {
  term: string
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const entry = useGlossaryEntry(term)
  const label = children ?? term
  if (!entry) return <Text>{label}</Text>
  return (
    <>
      <View className="flex-row items-center">
        <Text>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`What is ${entry.term}?`}
          className="size-11 items-center justify-center"
          onPress={() => setOpen(true)}
        >
          <Icon as={CircleHelp} size={14} className="text-muted-foreground" />
        </Pressable>
      </View>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <Text className="text-xs text-muted-foreground">What is this?</Text>
        <Text className="font-medium">{entry.term}</Text>
        <Text className="text-sm text-muted-foreground">
          {entry.definition}
        </Text>
      </Sheet>
    </>
  )
}
