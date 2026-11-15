import type { ReactNode } from "react"
import { Modal, Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Text } from "@/components/ui/text"

/** Presents scrollable leaf content in a dismissible bottom sheet. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="absolute inset-0 bg-foreground/20"
          onPress={onClose}
        />
        <View className="max-h-[85%] rounded-t-2xl bg-background">
          <SafeAreaView edges={["bottom"]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-4 px-6 pt-3 pb-6">
                <View
                  aria-hidden
                  className="h-1 w-10 self-center rounded-full bg-border"
                />
                {title && <Text className="font-medium">{title}</Text>}
                {children}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  )
}
