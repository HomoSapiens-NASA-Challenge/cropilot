import { createLink } from "@tanstack/react-router"
import { cn } from "cn"
import { ChevronRight } from "lucide-react"
import type { ComponentProps } from "react"
import { buttonVariants } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"

const CTA_SIZES = {
  default: "h-12 px-6 text-base",
  compact: "h-10 px-4 text-sm",
} as const

const CTA_VARIANTS = {
  primary: "",
  outline: "border-primary/25 text-primary hover:text-primary",
  /** Solid light button for dark surfaces. */
  light:
    "border-transparent bg-background text-primary hover:bg-background/90 hover:text-primary",
  /** Outlined button for dark surfaces. */
  inverse:
    "border-inverse-foreground/25 bg-transparent text-inverse-foreground hover:bg-inverse-foreground/10 hover:text-inverse-foreground",
} as const

function CtaAnchor({
  variant = "primary",
  size = "default",
  withChevron = false,
  className,
  children,
  ...props
}: ComponentProps<"a"> & {
  variant?: keyof typeof CTA_VARIANTS
  size?: keyof typeof CTA_SIZES
  /** Marks the action that moves the visitor forward. */
  withChevron?: boolean
}) {
  return (
    <a
      {...props}
      className={cn(
        buttonVariants({
          variant: variant === "primary" ? "default" : "outline",
        }),
        CTA_SIZES[size],
        CTA_VARIANTS[variant],
        className
      )}
    >
      {children}
      {withChevron && (
        <ChevronRight
          data-icon="inline-end"
          className="transition-transform group-hover/button:translate-x-0.5"
        />
      )}
    </a>
  )
}

export const CtaLink = createLink(CtaAnchor)

function ArrowAnchor({ className, children, ...props }: ComponentProps<"a">) {
  return (
    <a
      {...props}
      className={cn(
        "group/arrow inline-flex items-center gap-1 rounded-lg font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      {children}
      <ChevronRight className="size-4 transition-transform group-hover/arrow:translate-x-0.5" />
    </a>
  )
}

export const ArrowLink = createLink(ArrowAnchor)

/** Opens the app, or the sign-in page when signed out. */
export function AppEntryLink({
  isSignedIn,
  signedOutLabel,
  size,
  className,
}: {
  isSignedIn: boolean
  signedOutLabel: string
  size?: keyof typeof CTA_SIZES
  className?: string
}) {
  const { t } = useI18n("landing")
  return (
    <CtaLink
      to={isSignedIn ? "/overview" : "/login"}
      size={size}
      withChevron
      className={className}
    >
      {t(isSignedIn ? "Open app" : signedOutLabel)}
    </CtaLink>
  )
}
