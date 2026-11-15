import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia"
import {
  type SharedValue,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated"
import { SVG_COLORS } from "@/lib/theme"

// Light ribbons around a ring, in the single accent of the visual system.
// level (0-1) widens and brightens them; speed is how fast they drift.
const ORB = Skia.RuntimeEffect.Make(`
uniform float2 size;
uniform float time;
uniform float level;
uniform float3 color;

half4 main(float2 position) {
  float2 uv = (position - size * 0.5) / (min(size.x, size.y) * 0.5);
  float radius = length(uv);
  float angle = atan(uv.y, uv.x);
  float ring = 0.6 + 0.08 * level;
  float glow = 0.0;
  for (int i = 0; i < 4; i++) {
    float band = float(i);
    float wave = (0.035 + 0.09 * level)
      * sin(angle * (3.0 + band) + time * (0.5 + 0.2 * band) + band * 1.7);
    float distance = abs(radius - (ring + wave - band * 0.03));
    glow += (0.003 + 0.004 * level) / (distance + 0.004);
  }
  float core = smoothstep(ring + 0.05, 0.0, radius) * (0.08 + 0.1 * level);
  float alpha = clamp(glow * 0.2 + core, 0.0, 1.0) * smoothstep(1.0, 0.82, radius);
  return half4(half3(color) * half(alpha), half(alpha));
}
`)
if (!ORB) throw new Error("The voice orb shader does not compile")
const ORB_EFFECT = ORB

/** Converts an `hsl(h s% l%)` token to the 0-1 RGB a shader takes. */
function hslToRgb(token: string): [number, number, number] {
  const match = /hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/.exec(token)
  if (!match) throw new Error(`Not an hsl token: ${token}`)
  const [hue, saturation, lightness] = [
    Number(match[1]),
    Number(match[2]) / 100,
    Number(match[3]) / 100,
  ]
  const amplitude = saturation * Math.min(lightness, 1 - lightness)
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12
    return lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [channel(0), channel(8), channel(4)]
}
const PRIMARY_RGB = hslToRgb(SVG_COLORS.primary)

export function VoiceOrb({
  size,
  level,
  speed,
}: {
  size: number
  level: SharedValue<number>
  speed: SharedValue<number>
}) {
  const time = useSharedValue(0)
  useFrameCallback((frame) => {
    time.value += ((frame.timeSincePreviousFrame ?? 16) / 1000) * speed.value
  })
  const uniforms = useDerivedValue(() => ({
    size: [size, size],
    time: time.value,
    level: level.value,
    color: PRIMARY_RGB,
  }))
  return (
    <Canvas style={{ width: size, height: size }}>
      <Fill>
        <Shader source={ORB_EFFECT} uniforms={uniforms} />
      </Fill>
    </Canvas>
  )
}
