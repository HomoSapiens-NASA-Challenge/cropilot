import type { LucideIcon } from "lucide-react-native"
import { View } from "react-native"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"

// A section whose models are not wired yet. It shows no numbers, not even mock ones.
interface ComingSoonProps {
  icon: LucideIcon
  title: string
  description: string
}

export function ComingSoon({ icon, title, description }: ComingSoonProps) {
  return (
    <View className="items-center gap-3 rounded-xl border border-border bg-card px-6 py-14">
      <View className="size-10 items-center justify-center rounded-lg border border-border bg-background">
        <Icon as={icon} className="text-primary" size={20} />
      </View>
      <Text className="text-center text-xl font-light text-foreground">
        {title}
      </Text>
      <Text className="text-center text-sm text-muted-foreground">
        {description}
      </Text>
      <Badge variant="outline" className="self-center">
        <Text>Not available yet</Text>
      </Badge>
    </View>
  )
}
