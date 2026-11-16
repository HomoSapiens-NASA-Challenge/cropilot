import { useQueryClient } from "@tanstack/react-query"
import { View } from "react-native"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { signOut } from "@/features/auth/session"
import type { Identity } from "@/lib/auth"

export function UserMenu({ identity }: { identity: Identity }) {
  const queryClient = useQueryClient()

  return (
    <View className="flex-row items-center gap-1">
      <View className="max-w-36">
        <Text className="text-sm" numberOfLines={1}>
          {identity.name}
        </Text>
        <Text variant="muted" className="text-xs" numberOfLines={1}>
          @{identity.id}
        </Text>
      </View>
      <Button variant="ghost" size="sm" onPress={() => signOut(queryClient)}>
        <Text>Sign out</Text>
      </Button>
    </View>
  )
}
