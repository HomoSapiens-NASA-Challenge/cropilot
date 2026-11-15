import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"

/** Selects one of a set of mutually exclusive tabs. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
}) {
  return (
    <View className="w-full flex-row rounded-lg bg-muted p-1">
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => onChange(option.value)}
          className={cn(
            "min-h-11 flex-1 items-center justify-center rounded-lg px-2",
            option.value === value && "bg-background"
          )}
        >
          <Text
            className={cn(
              "text-center text-muted-foreground",
              option.value === value && "text-foreground"
            )}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
