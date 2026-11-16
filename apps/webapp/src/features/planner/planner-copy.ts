import { translate } from "@/lib/i18n"

/** Translate displayed metadata while leaving locations, run IDs and measurements intact. */
export function plannerText(text: string): string {
  const cycle = text.split(" / ")
  if (
    cycle.length > 1 &&
    cycle.every((crop) =>
      [
        "Fallow",
        "Soybean",
        "Maize",
        "Wheat",
        "Wheat + second soybean",
      ].includes(crop)
    )
  ) {
    return cycle.map((crop) => translate(crop)).join(" / ")
  }
  const campaigns = /^Campaigns (.+)$/.exec(text)
  if (campaigns?.[1]) {
    return translate("Campaigns {campaigns}", { campaigns: campaigns[1] })
  }
  const cell = /^Grid cell of about 55 km around (.+)$/.exec(text)
  if (cell?.[1]) {
    return translate("Grid cell of about 55 km around {point}", {
      point: cell[1],
    })
  }
  const pixel =
    /^250 m pixel at (.+); the rooting depth is an assumption$/.exec(text)
  if (pixel?.[1]) {
    return translate(
      "250 m pixel at {point}; the rooting depth is an assumption",
      {
        point: pixel[1],
      }
    )
  }
  const capacity =
    /^Soil water capacity \((.+) mm\), the size of the water bucket$/.exec(text)
  if (capacity?.[1]) {
    return translate(
      "Soil water capacity ({capacity} mm), the size of the water bucket",
      {
        capacity: capacity[1],
      }
    )
  }
  const department = /^Department (.+)$/.exec(text)
  if (department?.[1]) {
    return translate("Department {department}", { department: department[1] })
  }
  const latitude = /^Latitude band (.+)$/.exec(text)
  if (latitude?.[1]) {
    return translate("Latitude band {band}", { band: latitude[1] })
  }
  const best =
    /^Best of (\d+) repeating cycles of up to (\d+) campaigns by expected score on training campaigns only\.$/.exec(
      text
    )
  if (best?.[1] && best[2]) {
    return translate(
      "Best of {cycles} repeating cycles of up to {campaigns} campaigns by expected score on training campaigns only.",
      {
        cycles: best[1],
        campaigns: best[2],
      }
    )
  }
  const secondSoybean =
    /^Second soybean is not simulated for (.+): the MAGyP department record has too few campaigns or repeats the first-soybean figure\.$/.exec(
      text
    )
  if (secondSoybean?.[1]) {
    return translate(
      "Second soybean is not simulated for {department}: the MAGyP department record has too few campaigns or repeats the first-soybean figure.",
      { department: secondSoybean[1] }
    )
  }
  const missing = /^The simulator has no itinerary for '(.+)'\.$/.exec(text)
  if (missing?.[1]) {
    return translate("The simulator has no itinerary for '{crop}'.", {
      crop: translate(missing[1]),
    })
  }
  const unavailable = /^'(.+)' is not simulated for (.+)\.$/.exec(text)
  if (unavailable?.[1] && unavailable[2]) {
    return translate("'{crop}' is not simulated for {department}.", {
      crop: translate(unavailable[1]),
      department: unavailable[2],
    })
  }
  return translate(text)
}
