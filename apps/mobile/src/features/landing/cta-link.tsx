import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import { Pressable } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"

const CTA_SIZES = {
  default: { box: "h-12 px-6", label: "text-base" },
  compact: { box: "h-10 px-4", label: "text-sm" },
} as const

const CTA_VARIANTS = {
  primary: {
    box: "bg-primary active:bg-primary/80",
    label: "text-primary-foreground",
  },
  outline: {
    box: "border border-primary/25 bg-background active:bg-accent",
    label: "text-primary",
  },
  /** Solid light button for dark surfaces. */
  light: {
    box: "bg-background active:bg-background/90",
    label: "text-primary",
  },
  /** Outlined button for dark surfaces. */
  inverse: {
    box: "border border-inverse-foreground/25 active:bg-inverse-foreground/10",
    label: "text-inverse-foreground",
  },
} as const

export function CtaLink({
  label,
  variant = "primary",
  size = "default",
  withChevron = false,
  onPress,
  className,
}: {
  label: string
  variant?: keyof typeof CTA_VARIANTS
  size?: keyof typeof CTA_SIZES
  /** Marks the action that moves the visitor forward. */
  withChevron?: boolean
  onPress: () => void
  className?: string
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      className={cn(
        "flex-row items-center justify-center gap-1.5 self-start rounded-lg",
        CTA_SIZES[size].box,
        CTA_VARIANTS[variant].box,
        className
      )}
    >
      <Text className={cn(CTA_SIZES[size].label, CTA_VARIANTS[variant].label)}>
        {label}
      </Text>
      {withChevron ? (
        <Icon
          as={ChevronRight}
          size={16}
          className={CTA_VARIANTS[variant].label}
        />
      ) : null}
    </Pressable>
  )
}

export function ArrowLink({
  label,
  onPress,
  className,
}: {
  label: string
  onPress: () => void
  className?: string
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      className="flex-row items-center gap-1 self-start py-1"
    >
      <Text className={cn("font-medium text-primary", className)}>{label}</Text>
      <Icon as={ChevronRight} size={16} className="text-primary" />
    </Pressable>
  )
}

export function AppEntryLink({
  signedOutLabel,
  size,
  className,
}: {
  signedOutLabel: string
  size?: keyof typeof CTA_SIZES
  className?: string
}) {
  return (
    <CtaLink
      label={signedOutLabel}
      size={size}
      withChevron
      className={className}
      onPress={() => router.push("/sign-in")}
    />
  )
}
