import { useEffect, useState } from "react"
import { AccessibilityInfo } from "react-native"

export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(true)

  useEffect(() => {
    let active = true
    let changed = false
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        changed = true
        setReduceMotion(enabled)
      }
    )
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active && !changed) setReduceMotion(enabled)
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return reduceMotion
}
