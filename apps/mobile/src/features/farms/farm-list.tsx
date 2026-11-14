import { listFarmsOptions } from "@cropilot/api"
import { useQuery } from "@tanstack/react-query"
import { ActivityIndicator, FlatList, StyleSheet, Text } from "react-native"

export function FarmList() {
  const farms = useQuery(listFarmsOptions())

  if (farms.isPending) {
    return <ActivityIndicator style={styles.message} />
  }
  if (farms.isError) {
    return <Text style={styles.message}>Could not load your farms.</Text>
  }

  return (
    <FlatList
      data={farms.data}
      keyExtractor={(farm) => farm.id}
      renderItem={({ item }) => <Text style={styles.row}>{item.name}</Text>}
      ListEmptyComponent={<Text style={styles.message}>No farms yet.</Text>}
      refreshing={farms.isRefetching}
      onRefresh={farms.refetch}
    />
  )
}

const styles = StyleSheet.create({
  row: {
    padding: 16,
    fontSize: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d4d4d4",
  },
  message: {
    padding: 24,
    textAlign: "center",
    color: "#737373",
  },
})
