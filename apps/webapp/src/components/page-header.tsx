export function PageHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl/9 font-light tracking-tight">{title}</h1>
      <p className="max-w-2xl text-muted-foreground">{description}</p>
    </div>
  )
}
