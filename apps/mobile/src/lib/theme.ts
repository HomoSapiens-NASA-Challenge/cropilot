import { DefaultTheme, type Theme } from "expo-router/react-navigation"

// Native navigation chrome cannot read CSS variables; keep in sync with src/global.css.
export const NAV_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    background: "hsl(214 47% 98.1%)",
    border: "hsl(214 28.6% 90.8%)",
    card: "hsl(0 0% 100%)",
    notification: "hsl(348.5 78% 49.1%)",
    primary: "hsl(228.5 60.1% 48.6%)",
    text: "hsl(213.4 57.4% 12.3%)",
  },
}

// SVG drawings (react-native-svg) take color values, not classes. Same values
// as src/global.css; crop colors are the data-encoding exception of the
// visual system, declared here and in global.css only.
export const SVG_COLORS = {
  inverseForeground: "hsl(0 0% 100%)",
  highlight: "hsl(223.4 87% 79.2%)",
  primary: "hsl(228.5 60.1% 48.6%)",
  primaryForeground: "hsl(0 0% 100%)",
  foreground: "hsl(213.4 57.4% 12.3%)",
  mutedForeground: "hsl(215.1 15.9% 40.4%)",
  border: "hsl(214 28.6% 90.8%)",
  card: "hsl(0 0% 100%)",
  accent: "hsl(214 54.3% 95.9%)",
  maize: "hsl(40.8 100% 46.5%)",
  soybean: "hsl(154.8 64.9% 38%)",
  wheatSoybean: "hsl(15.9 67.5% 54.1%)",
} as const
