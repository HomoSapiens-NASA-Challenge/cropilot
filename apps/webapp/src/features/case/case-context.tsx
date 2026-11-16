import type { GlossaryTerm, SourceRef } from "@cropilot/api"
import { createContext, type ReactNode, useContext, useMemo } from "react"
import { originalInputIds } from "@/features/case/source-lineage"

type CaseReferences = {
  sources: ReadonlyArray<SourceRef>
  glossary: ReadonlyArray<GlossaryTerm>
}

const CaseReferencesContext = createContext<CaseReferences | null>(null)

const NO_GLOSSARY: ReadonlyArray<GlossaryTerm> = []

export function CaseReferencesProvider({
  sources,
  glossary = NO_GLOSSARY,
  children,
}: {
  sources: ReadonlyArray<SourceRef>
  glossary?: ReadonlyArray<GlossaryTerm>
  children: ReactNode
}) {
  const references = useMemo(() => ({ sources, glossary }), [sources, glossary])
  return (
    <CaseReferencesContext.Provider value={references}>
      {children}
    </CaseReferencesContext.Provider>
  )
}

function useCaseReferences(): CaseReferences {
  const references = useContext(CaseReferencesContext)
  if (!references) {
    throw new Error("Evidence needs a CaseReferencesProvider above it")
  }
  return references
}

/** The sources behind a list of ids. An unknown id means the bundle is broken, so it fails loudly. */
export function useSources(ids: ReadonlyArray<string>): SourceRef[] {
  const { sources } = useCaseReferences()
  return ids.map((id) => {
    const source = sources.find((entry) => entry.id === id)
    if (!source) {
      throw new Error(`Unknown source id: ${id}`)
    }
    return source
  })
}

/** Lineage can point to an input documented by the method but absent from this case. */
export function useSourceInputs(id: string): SourceRef[] {
  const { sources } = useCaseReferences()
  return originalInputIds(id).flatMap((inputId) => {
    const source = sources.find((entry) => entry.id === inputId)
    return source ? [source] : []
  })
}

/** Direct citations remain strict; add only upstream records actually supplied by the case. */
export function useEvidenceSources(ids: ReadonlyArray<string>): SourceRef[] {
  const direct = useSources(ids)
  const { sources } = useCaseReferences()
  const references = new Map(direct.map((source) => [source.id, source]))
  for (const id of ids) {
    for (const inputId of originalInputIds(id)) {
      const source = sources.find((entry) => entry.id === inputId)
      if (source) references.set(source.id, source)
    }
  }
  return [...references.values()]
}

export function useGlossaryEntry(term: string): GlossaryTerm | undefined {
  const { glossary } = useCaseReferences()
  const wanted = term.toLowerCase()
  return (
    glossary.find((entry) => entry.term.toLowerCase() === wanted) ??
    glossary.find((entry) => entry.term.toLowerCase().includes(wanted))
  )
}
