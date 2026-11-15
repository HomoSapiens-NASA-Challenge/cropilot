import { cva, type VariantProps } from "class-variance-authority"
import { Pressable } from "react-native"
import { TextClassContext } from "@/components/ui/text"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group shrink-0 flex-row items-center justify-center gap-2 rounded-lg",
  {
    variants: {
      variant: {
        default: "bg-primary active:bg-primary/80",
        destructive: "bg-destructive/10 active:bg-destructive/20",
        outline: "border border-border bg-background active:bg-muted",
        secondary: "bg-secondary active:bg-secondary/80",
        ghost: "active:bg-muted",
        link: "",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

const buttonTextVariants = cva("text-foreground text-sm font-normal", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary group-active:underline",
    },
    size: { default: "", sm: "", lg: "", icon: "" },
  },
  defaultVariants: { variant: "default", size: "default" },
})

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(
          props.disabled && "opacity-50",
          buttonVariants({ variant, size }),
          className
        )}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  )
}

export type { ButtonProps }
export { Button, buttonTextVariants, buttonVariants }
