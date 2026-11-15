export type ComparisonFile = {
  status: string
  current_rotation_confirmed: boolean
  reason: string
}

export type CropHistoryFile = {
  limitations: string[]
  fields: {
    field_id: string
    maps: {
      map_id: string
      campaign: string
      season: string
      source_url: string
      class_histogram: {
        label_original: string
        fraction_of_field_pixels: number
      }[]
      fractions_of_field_pixels: {
        source_mask: number
        transparent_fill: number
        unknown_code: number
        missing: number
      }
    }[]
  }[]
}

export type FieldsFile = {
  features: {
    properties: {
      source_id: string
      label: string
      geodesic_area_ha: number
      source_datetime: string
      source_method: string
      source_confidence_0_100: number
      farmer_confirmed: boolean
      cadastral_boundary: boolean
      demo_selected: boolean
      local_diagnostics: { soil_profile: boolean }
    }
  }[]
}

export type SoilProfileFile = {
  mapped_field_id: string
  latitude: number
  longitude: number
  scope: string
  rows: {
    property: string
    depth_label: string
    statistic: string
    spatial_support: string
    unit: string
    value: number
  }[]
}

export type StudyAreasFile = {
  features: {
    properties: {
      name: string
      geometry_role: string
      available_local_footprints: number
    }
  }[]
}

export type SurfaceWaterFile = {
  manifest: { catalog_period: string[] }
  records: {
    field_id: string
    status: string
    valid_pixel_count: number | null
  }[]
}

export type VegetationFile = {
  limitations: string[]
  records: {
    field_id: string
    month: string
    acquired_utc: string
    scene_id: string
    ndvi_mean: number | null
    valid_ndvi_fraction: number
    valid_ndvi_pixel_count: number
    field_pixel_count: number
  }[]
}
