import { Sprout } from "lucide-react-native"
import { View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"

export function BrandLogo({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        "size-8 shrink-0 items-center justify-center rounded-lg bg-primary",
        className
      )}
    >
      <Icon as={Sprout} className="text-primary-foreground" size={16} />
    </View>
  )
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <View className={cn("flex-row items-center gap-2", className)}>
      <BrandLogo />
      <Text className="text-lg font-medium tracking-tight">Cropilot</Text>
    </View>
  )
}
