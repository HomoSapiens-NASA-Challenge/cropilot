import { CircleSlash, type LucideIcon } from "lucide-react-native"
import { createContext, type ReactNode, useContext } from "react"
import { View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"

const BlockHeadersContext = createContext(true)

export function HideBlockHeaders({ children }: { children: ReactNode }) {
  return (
    <BlockHeadersContext.Provider value={false}>
      {children}
    </BlockHeadersContext.Provider>
  )
}

export function BlockSection({
  id,
  title,
  lead,
  children,
  className,
}: {
  id?: string
  title: ReactNode
  lead?: ReactNode
  children: ReactNode
  className?: string
}) {
  const showHeader = useContext(BlockHeadersContext)
  return (
    <View
      nativeID={id}
      className={cn("gap-4 border-t border-border px-4 py-6", className)}
    >
      {showHeader && (
        <View className="gap-2">
          <Text className="text-2xl font-light tracking-tight">{title}</Text>
          {lead && <Text className="text-muted-foreground">{lead}</Text>}
        </View>
      )}
      {children}
    </View>
  )
}

export function Panel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <View
      className={cn("rounded-xl border border-border bg-card p-4", className)}
    >
      {children}
    </View>
  )
}

export function Stat({
  label,
  value,
  detail,
  evidence,
}: {
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  evidence?: ReactNode
}) {
  return (
    <View className="min-w-0 gap-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-4xl font-light tracking-tight">{value}</Text>
      {detail && (
        <Text className="text-sm text-muted-foreground">{detail}</Text>
      )}
      {evidence}
    </View>
  )
}

export function Callout({
  icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <View
      className={cn(
        "flex-row gap-3 rounded-xl border border-primary/30 bg-card p-4",
        className
      )}
    >
      <Icon as={icon} size={16} className="mt-0.5 text-primary" />
      <View className="min-w-0 flex-1 gap-1.5">
        <Text className="font-medium">{title}</Text>
        {typeof children === "string" || typeof children === "number" ? (
          <Text className="text-muted-foreground">{children}</Text>
        ) : (
          <View className="gap-2">{children}</View>
        )}
      </View>
    </View>
  )
}

export function NotAvailable({
  title = "Not available for this region yet",
  description,
  children,
  className,
}: {
  title?: string
  description?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <View
      className={cn(
        "items-center gap-3 rounded-xl border border-border bg-card px-4 py-12",
        className
      )}
    >
      <Icon as={CircleSlash} size={20} className="text-primary" />
      <Text className="text-center text-xl font-light">{title}</Text>
      {description && (
        <Text className="text-center text-muted-foreground">{description}</Text>
      )}
      {children}
    </View>
  )
}

export function NotComputedRow({
  title,
  reason,
  className,
}: {
  title: ReactNode
  reason: ReactNode
  className?: string
}) {
  return (
    <View
      className={cn(
        "gap-1 rounded-lg border border-dashed border-border px-3 py-2.5",
        className
      )}
    >
      <Text className="text-sm font-medium">
        {title}
        <Text className="font-normal text-muted-foreground">
          {" "}
          · Not computed
        </Text>
      </Text>
      <Text className="text-sm text-muted-foreground">{reason}</Text>
    </View>
  )
}
