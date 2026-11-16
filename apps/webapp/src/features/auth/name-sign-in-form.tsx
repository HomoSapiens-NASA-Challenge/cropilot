import { handleFromName } from "@cropilot/api"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "@/features/auth/session"
import { useI18n } from "@/lib/i18n"

/** No account and no password: the typed name becomes the reader's handle. */
export function NameSignInForm() {
  const { t } = useI18n("app")

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const handle = handleFromName(name)
  const isInvalid = submitted && handle === null

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        if (signIn(queryClient, name)) {
          navigate({ to: "/overview" })
        }
      }}
    >
      <Field data-invalid={isInvalid}>
        <FieldLabel htmlFor="name">{t("Your name or handle")}</FieldLabel>
        <Input
          id="name"
          name="name"
          className="h-12 text-base"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={isInvalid}
          aria-describedby="name-handle"
          autoComplete="nickname"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={80}
          autoFocus
        />
        {isInvalid ? (
          <FieldError id="name-handle">
            {t("Use at least two letters or numbers.")}
          </FieldError>
        ) : (
          <FieldDescription id="name-handle" aria-live="polite">
            {handle
              ? t("You will be @{value1}.", { value1: handle })
              : t("Use at least two letters or numbers.")}
          </FieldDescription>
        )}
      </Field>
      <Button type="submit" size="lg" className="h-12 w-full text-base">
        {t("Continue")}
        <ArrowRight
          data-icon="inline-end"
          className="transition-transform group-hover/button:translate-x-0.5"
        />
      </Button>
    </form>
  )
}
