import { useI18n } from "@/lib/i18n"
export function PageHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const { t } = useI18n("app")

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl/9 font-light tracking-tight">{t(title)}</h1>
      <p className="max-w-2xl text-muted-foreground">{t(description)}</p>
    </div>
  )
}
