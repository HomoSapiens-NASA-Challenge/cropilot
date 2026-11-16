import { cn } from "cn"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useI18n } from "@/lib/i18n"

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  disabled?: boolean
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: ReadonlyArray<SegmentedOption<T>>
  onChange: (value: T) => void
  className?: string
}) {
  const { t } = useI18n()
  return (
    <ToggleGroup
      aria-label={t(label)}
      variant="outline"
      size="sm"
      spacing={0}
      value={[value]}
      onValueChange={(next) => {
        const chosen = options.find((option) => option.value === next[0])
        if (chosen) onChange(chosen.value)
      }}
      className={cn("flex-wrap", className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className="aria-pressed:bg-primary/10 aria-pressed:text-primary data-pressed:bg-primary/10 data-pressed:text-primary"
        >
          {t(option.label)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
