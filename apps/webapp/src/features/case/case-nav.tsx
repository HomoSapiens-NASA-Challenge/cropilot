import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { useEffect, useMemo, useState } from "react"

export type CaseSection = { id: string; label: string }

/** The section the reader is in: the last one whose top has passed the upper part of the screen. */
function useActiveSection(ids: ReadonlyArray<string>): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0])

  useEffect(() => {
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const current = ids.find((id) => visible.has(id))
        if (current) setActive(current)
      },
      { rootMargin: "-30% 0px -60% 0px" }
    )
    for (const id of ids) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [ids])

  return active
}

/** Sticky glass bar under the site header. On a phone it scrolls sideways. */
export function CaseNav({
  zoneId,
  sections,
}: {
  zoneId: string
  sections: ReadonlyArray<CaseSection>
}) {
  const ids = useMemo(() => sections.map((section) => section.id), [sections])
  const active = useActiveSection(ids)

  return (
    <nav
      aria-label="On this page"
      className="sticky top-18 z-40 border-b border-border/70 bg-background/75 backdrop-blur-lg"
    >
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 whitespace-nowrap sm:px-6">
        {sections.map((section) => (
          <li key={section.id}>
            <Link
              to="/case/$zoneId"
              params={{ zoneId }}
              hash={section.id}
              aria-current={section.id === active ? "location" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-lg px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                section.id === active && "bg-accent font-medium text-primary"
              )}
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
