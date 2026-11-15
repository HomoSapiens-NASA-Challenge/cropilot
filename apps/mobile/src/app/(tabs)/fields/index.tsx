import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { PageHeader } from "@/components/page-header"
import { Text } from "@/components/ui/text"
import { FieldCard } from "@/features/fields/field-card"
import { FIELDS, STUDY_AREA } from "@/features/fields/field-data"

export default function FieldsScreen() {
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-secondary">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 p-6"
      >
        {/* Header block */}
        <View className="gap-1">
          <PageHeader
            title={STUDY_AREA.name}
            description={`${FIELDS.length} satellite-estimated field footprints with local diagnostics`}
          />
          <Text className="text-xs text-muted-foreground">
            {STUDY_AREA.role}
          </Text>
        </View>

        {/* List of field cards */}
        {FIELDS.map((field) => (
          <FieldCard key={field.id} field={field} />
        ))}

        {/* Footer */}
        <Text className="text-xs text-muted-foreground">
          Cropilot supports the agronomist's judgment. It never replaces it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
