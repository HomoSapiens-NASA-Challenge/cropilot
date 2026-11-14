import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { signInWithGoogle } from "@/features/auth/session"

export function GoogleSignInButton() {
  const signIn = useMutation({ mutationFn: signInWithGoogle })

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        size="lg"
        disabled={signIn.isPending}
        onClick={() => signIn.mutate()}
      >
        Continue with Google
      </Button>
      {signIn.error && (
        <p role="alert" className="text-sm text-destructive">
          {signIn.error.message}
        </p>
      )}
    </div>
  )
}
