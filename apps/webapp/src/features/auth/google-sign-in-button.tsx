import { useMutation } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signInWithGoogle } from "@/features/auth/session"

export function GoogleSignInButton() {
  const signIn = useMutation({ mutationFn: signInWithGoogle })

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        className="h-12 w-full text-base"
        disabled={signIn.isPending}
        onClick={() => signIn.mutate()}
      >
        {signIn.isPending ? "Redirecting to Google…" : "Continue with Google"}
        <ArrowRight
          data-icon="inline-end"
          className="transition-transform group-hover/button:translate-x-0.5"
        />
      </Button>
      {signIn.error && (
        <p role="alert" className="text-sm text-destructive">
          {signIn.error.message}
        </p>
      )}
    </div>
  )
}
