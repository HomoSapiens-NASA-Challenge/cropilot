import { cn } from "cn"
import { CROP_IDS, CROPS, type Crop } from "@/features/farm-map/crops"
import type { CropShare } from "@/features/farm-map/synthetic-demo-farms"

export function CropSwatch({
  crop,
  className,
}: {
  crop: Crop
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-sm", className)}
      style={{ backgroundColor: CROPS[crop].color }}
    />
  )
}

export function CropMixBar({
  mix,
  className,
}: {
  mix: ReadonlyArray<CropShare>
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-1.5 w-full gap-px overflow-hidden rounded-full",
        className
      )}
    >
      {mix.map((entry) => (
        <span
          key={entry.crop}
          className="h-full"
          style={{
            width: `${entry.share * 100}%`,
            backgroundColor: CROPS[entry.crop].color,
          }}
        />
      ))}
    </div>
  )
}

export function CropLegend() {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-background/75 px-3 py-2.5 text-xs shadow-sm ring-1 ring-foreground/10 backdrop-blur-lg">
      <span className="font-medium text-foreground">Crop this campaign</span>
      {CROP_IDS.map((crop) => (
        <span
          key={crop}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <CropSwatch crop={crop} />
          {CROPS[crop].label}
        </span>
      ))}
      <span className="mt-1 text-[0.65rem] text-muted-foreground">
        Synthetic demo data
      </span>
    </div>
  )
}
