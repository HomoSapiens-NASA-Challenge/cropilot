import { View } from "react-native"
import { CROPS, type Crop } from "@/features/farm-map/crops"
import { cn } from "@/lib/utils"

export function CropSwatch({ crop }: { crop: Crop }) {
  return (
    <View
      className={cn("h-2.5 w-2.5 rounded-sm", CROPS[crop].swatchClassName)}
    />
  )
}
