import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { LanguageSelector } from "@/components/language-selector"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NameSignInForm } from "@/features/auth/name-sign-in-form"
import { sessionOptions } from "@/features/auth/session"
import { StrandsArt } from "@/features/landing/strands-art"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionOptions)
    if (session) {
      throw redirect({ to: "/overview" })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { t } = useI18n("app")

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-secondary">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-48 right-0 size-160 rounded-full bg-primary/10 blur-3xl" />
        <StrandsArt className="absolute inset-0 size-full" />
      </div>
      <header className="mx-auto flex w-full max-w-316 items-center justify-between px-6 py-5">
        <Link to="/" className="rounded-lg">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Link
            to="/"
            className="flex items-center gap-1 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t("Back to home")}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <Card className="w-full max-w-md gap-6 border border-background/80 bg-background/75 py-10 shadow-2xl ring-0 backdrop-blur-lg [--card-spacing:--spacing(10)]">
          <CardHeader className="gap-2">
            <CardTitle className="text-3xl font-light tracking-tight">
              <h1>{t("What should we call you?")}</h1>
            </CardTitle>
            <CardDescription className="text-base">
              {t(
                "Type your name or a handle to save your region, farms and planner runs. No account, no password."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NameSignInForm />
          </CardContent>
          <CardFooter className="border-t bg-transparent pt-6 text-xs text-muted-foreground">
            {t(
              "Anyone who types the same name opens the same workspace, so pick one that is yours. Cropilot supports the agronomist's judgment and never replaces it."
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
