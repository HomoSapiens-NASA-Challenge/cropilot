import { useQueryClient } from "@tanstack/react-query"
import { View } from "react-native"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { signOut } from "@/features/auth/session"

export function UserMenu({ name }: { name: string }) {
  const queryClient = useQueryClient()

  return (
    <View className="flex-row items-center gap-1">
      <Text variant="muted" numberOfLines={1} className="max-w-36">
        {name}
      </Text>
      <Button variant="ghost" size="sm" onPress={() => signOut(queryClient)}>
        <Text>Sign out</Text>
      </Button>
    </View>
  )
}
