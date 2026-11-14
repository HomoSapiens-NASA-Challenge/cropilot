import { Button } from "@/components/ui/button"
import { signOut } from "@/features/auth/session"

export function UserMenu({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{name}</span>
      <Button variant="outline" size="sm" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  )
}
