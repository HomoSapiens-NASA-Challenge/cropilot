import { ChevronRight } from "lucide-react-native"
import type { ReactNode } from "react"
import { Pressable, View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"

type ListRowProps = {
  title: string
  subtitle?: string
  right?: ReactNode
  onPress?: () => void
  accessibilityLabel?: string
}
/** Displays a divided row, with navigation affordance when pressable. */
export function ListRow({
  title,
  subtitle,
  right,
  onPress,
  accessibilityLabel,
}: ListRowProps) {
  const content = (
    <>
      <View className="flex-1 gap-1">
        <Text className="text-base">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-muted-foreground">{subtitle}</Text>
        )}
      </View>
      {right}
      {onPress && (
        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
      )}
    </>
  )
  const className =
    "min-h-11 flex-row items-center gap-3 border-b border-border py-3"
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={className}
    >
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  )
}

/** Groups related list rows under an optional title. */
export function ListSection({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <View>
      {title && <Text className="font-medium">{title}</Text>}
      {children}
    </View>
  )
}
