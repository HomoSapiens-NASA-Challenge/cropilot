import { listFarmsOptions } from "@cropilot/api"
import { useQuery } from "@tanstack/react-query"
import { ActivityIndicator, FlatList, View } from "react-native"
import { Separator } from "@/components/ui/separator"
import { Text } from "@/components/ui/text"
import { FarmForm } from "@/features/farms/farm-form"
import { cn } from "@/lib/utils"

export function FarmList() {
  const farms = useQuery(listFarmsOptions())

  if (farms.isPending) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator />
      </View>
    )
  }
  if (farms.isError) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-sm text-muted-foreground">
          Could not load your farms.
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      data={farms.data}
      keyExtractor={(farm) => farm.id}
      contentContainerClassName="gap-0 p-4"
      keyboardShouldPersistTaps="handled"
      refreshing={farms.isRefetching}
      onRefresh={farms.refetch}
      ListHeaderComponent={
        <View className="mb-6 gap-6">
          <Text className="text-3xl font-light tracking-tight text-foreground">
            Farms
          </Text>
          <FarmForm />
        </View>
      }
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={
        <View className="rounded-lg border border-border bg-card px-4 py-3">
          <Text className="text-sm text-muted-foreground">No farms yet.</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const isFirst = index === 0
        const isLast = index === farms.data.length - 1
        return (
          <View
            className={cn(
              "bg-card border-x border-border px-4 py-3",
              isFirst && "rounded-t-lg border-t",
              isLast && "rounded-b-lg border-b"
            )}
          >
            <Text className="text-base text-foreground">{item.name}</Text>
          </View>
        )
      }}
    />
  )
}
