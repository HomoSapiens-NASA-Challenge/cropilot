import {
  type ReactNode,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react"
import { config } from "zod"
import englishValidation from "zod/v4/locales/en.js"
import spanishValidation from "zod/v4/locales/es.js"
import { esApp } from "@/locales/es-app"
import { esCase } from "@/locales/es-case"
import { esCommon } from "@/locales/es-common"
import { esLanding } from "@/locales/es-landing"

export type Locale = "en" | "es"
type TranslationScope = "landing" | "case" | "app"
type Values = Record<string, string | number>
const scopedCatalogs = { landing: esLanding, case: esCase, app: esApp }
const STORAGE_KEY = "cropilot.language.v1"
const listeners = new Set<() => void>()
const spanish: Record<string, string> = {
  ...esLanding,
  ...esCase,
  ...esApp,
  ...esCommon,
}

function storedLocale(): Locale {
  try {
    return typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEY) === "es"
      ? "es"
      : "en"
  } catch {
    // Private browsing can disable storage; language selection still works in memory.
    return "en"
  }
}

let currentLocale = storedLocale()

export function getLocale(): Locale {
  return currentLocale
}

export function setLocale(locale: Locale) {
  currentLocale = locale
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Persistence is optional; never prevent a user from changing the interface language.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function translate(
  text: string,
  localeOrValues: Locale | Values = getLocale(),
  values: Values = {},
  scope?: TranslationScope
): string {
  const locale =
    typeof localeOrValues === "string" ? localeOrValues : getLocale()
  const replacements =
    typeof localeOrValues === "string" ? values : localeOrValues
  const source =
    locale === "es"
      ? ((scope ? scopedCatalogs[scope][text] : undefined) ??
        spanish[text] ??
        text)
      : text
  return source.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(replacements, name) ? String(replacements[name]) : token
  )
}

export function useI18n(scope?: TranslationScope) {
  const locale = useSyncExternalStore<Locale>(subscribe, getLocale, () => "en")
  const t = useCallback(
    (text: string, values?: Values) => translate(text, locale, values, scope),
    [locale, scope]
  )
  return {
    locale,
    setLocale,
    t,
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n()
  useEffect(() => {
    document.documentElement.lang = locale
    config(locale === "es" ? spanishValidation() : englishValidation())
  }, [locale])
  useEffect(() => {
    function syncLanguage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      currentLocale = storedLocale()
      for (const listener of listeners) listener()
    }
    window.addEventListener("storage", syncLanguage)
    return () => window.removeEventListener("storage", syncLanguage)
  }, [])
  return children
}
