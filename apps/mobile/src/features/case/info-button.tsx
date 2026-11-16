import { Info } from "lucide-react-native"
import { type ReactNode, useState } from "react"
import { Pressable } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Sheet } from "@/components/ui/sheet"

export function InfoButton({
  title,
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  title: string
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`About ${title}`}
        className="size-11 items-center justify-center"
        onPress={() => setOpen(true)}
      >
        <Icon as={Info} size={22} className="text-primary" />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Sheet>
    </>
  )
}
