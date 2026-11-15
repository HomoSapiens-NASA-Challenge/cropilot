import { cva, type VariantProps } from "class-variance-authority"
import { View } from "react-native"
import { TextClassContext } from "@/components/ui/text"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "flex-row self-start items-center rounded-full border px-2 py-0.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary",
        secondary: "border-transparent bg-secondary",
        outline: "border-border",
        destructive: "border-transparent bg-destructive/10",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const badgeTextVariants = cva("text-xs font-medium", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      outline: "text-foreground",
      destructive: "text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
})

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof View> & VariantProps<typeof badgeVariants>) {
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <View className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  )
}

export { Badge, badgeVariants }
