import { cn } from "cn"
import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CropMixBar, CropSwatch } from "@/features/farm-map/crop-swatch"
import { CROPS } from "@/features/farm-map/crops"
import {
  formatHectares,
  formatLngLat,
  formatShare,
} from "@/features/farm-map/format"
import {
  type PowerCell,
  powerCellAt,
  powerDailySeriesUrl,
} from "@/features/farm-map/nasa-power-grid"
import {
  cropMix,
  type DemoFarm,
} from "@/features/farm-map/synthetic-demo-farms"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-secondary px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-light tracking-tight tabular-nums">
        {value}
      </span>
    </div>
  )
}

function SummaryTab({ farm }: { farm: DemoFarm }) {
  const mix = cropMix(farm)
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Area" value={formatHectares(farm.areaHa)} />
        <Stat label="Lots" value={String(farm.lots.length)} />
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          Crop mix this campaign
        </span>
        <CropMixBar mix={mix} className="h-2.5" />
        <ul className="flex flex-col gap-2">
          {mix.map((entry) => (
            <li
              key={entry.crop}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <CropSwatch crop={entry.crop} />
                {CROPS[entry.crop].label}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {formatHectares(entry.areaHa)} · {formatShare(entry.share)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">
          Current rotation
        </span>
        <span>{farm.rotation}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">
          Center
        </span>
        <span className="tabular-nums">{formatLngLat(farm.center)}</span>
      </div>
    </div>
  )
}

function LotsTab({
  farm,
  activeLotId,
  onHoverLot,
}: {
  farm: DemoFarm
  activeLotId: string | null
  onHoverLot: (lotId: string | null) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lot</TableHead>
          <TableHead>Crop</TableHead>
          <TableHead className="text-right">Area</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {farm.lots.map((lot) => (
          <TableRow
            key={lot.lotId}
            data-state={lot.lotId === activeLotId ? "selected" : undefined}
            className="cursor-default data-[state=selected]:bg-sidebar-accent"
            onMouseEnter={() => onHoverLot(lot.lotId)}
            onMouseLeave={() => onHoverLot(null)}
          >
            <TableCell className="font-medium">{lot.name}</TableCell>
            <TableCell>
              <span className="flex items-center gap-2">
                <CropSwatch crop={lot.crop} />
                {CROPS[lot.crop].label}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatHectares(lot.areaHa)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function NasaDataTab({
  farm,
  farmsInSameCell,
}: {
  farm: DemoFarm
  farmsInSameCell: ReadonlyArray<DemoFarm>
}) {
  const cell: PowerCell = powerCellAt(farm.center)
  const lastFullYear = new Date().getFullYear() - 1

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          NASA POWER grid cell
          <Badge variant="outline" className="font-normal">
            computed
          </Badge>
        </span>
        <p className="leading-relaxed">
          This farm falls in the cell centered at{" "}
          <span className="font-medium tabular-nums">
            {formatLngLat(cell.center)}
          </span>
          , about {cell.heightKm.toFixed(0)} × {cell.widthKm.toFixed(0)} km.
          POWER gives one value for the whole cell.
        </p>
      </div>
      <div
        className={cn(
          "rounded-lg border px-3 py-3 text-sm leading-relaxed",
          farmsInSameCell.length > 0
            ? "border-primary/20 bg-sidebar-accent"
            : "bg-secondary"
        )}
      >
        {farmsInSameCell.length > 0 ? (
          <>
            <span className="font-medium">
              Shares the cell with {farmsInSameCell.length} other demo{" "}
              {farmsInSameCell.length === 1 ? "farm" : "farms"}:
            </span>{" "}
            {farmsInSameCell.map((other) => other.name).join(", ")}. POWER
            cannot tell them apart; lot-level differences need 30 m imagery.
          </>
        ) : (
          "No other demo farm shares this cell."
        )}
      </div>
      <a
        href={powerDailySeriesUrl(farm.center, lastFullYear)}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-3 text-sm transition-colors hover:bg-secondary"
      >
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Open the raw daily series</span>
          <span className="text-xs text-muted-foreground">
            GWETROOT and PRECTOTCORR, {lastFullYear}, at the farm center
          </span>
        </span>
        <ExternalLink className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  )
}

export function FarmDetails({
  farm,
  farmsInSameCell,
  activeLotId,
  onHoverLot,
}: {
  farm: DemoFarm
  farmsInSameCell: ReadonlyArray<DemoFarm>
  activeLotId: string | null
  onHoverLot: (lotId: string | null) => void
}) {
  return (
    <Tabs defaultValue="summary" className="gap-4">
      <TabsList className="w-full">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="lots">Lots</TabsTrigger>
        <TabsTrigger value="nasa">NASA data</TabsTrigger>
      </TabsList>
      <TabsContent value="summary">
        <SummaryTab farm={farm} />
      </TabsContent>
      <TabsContent value="lots">
        <LotsTab
          farm={farm}
          activeLotId={activeLotId}
          onHoverLot={onHoverLot}
        />
      </TabsContent>
      <TabsContent value="nasa">
        <NasaDataTab farm={farm} farmsInSameCell={farmsInSameCell} />
      </TabsContent>
    </Tabs>
  )
}
