import { cn } from "cn"
import { Pause, Play } from "lucide-react"
import { useRef, useState, useSyncExternalStore } from "react"
import { PreviewWindow } from "@/features/landing/previews/preview-window"

export type RecordingId =
  | "years-like-this"
  | "compare"
  | "field-map"
  | "planner"
  | "mcp-claude"

const RECORDINGS: Record<
  RecordingId,
  { windowTitle: string; caption: string; label: string }
> = {
  "years-like-this": {
    windowTitle: "Public case · Years like this",
    caption:
      "The public case finding past campaigns that started like 2026/27.",
    label:
      "Screen recording of the public case finding past campaigns that started like 2026/27",
  },
  compare: {
    windowTitle: "Public case · Compare",
    caption: "Comparing rotation strategies with their water runs.",
    label:
      "Screen recording of the public case comparing rotation strategies with their water runs",
  },
  "field-map": {
    windowTitle: "Public case · Field",
    caption: "The crop-map lots of the Pergamino case.",
    label: "Screen recording of the crop-map lots of the Pergamino case",
  },
  planner: {
    windowTitle: "Rotation planner",
    caption: "A live rotation-planner run.",
    label: "Screen recording of a live rotation-planner run",
  },
  "mcp-claude": {
    windowTitle: "Claude · Cropilot connector",
    caption:
      "Claude calling the Cropilot MCP tools and showing the interactive rotation card.",
    label:
      "Screen recording of Claude using the Cropilot MCP connector to compare rotations for Pergamino",
  },
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/** A screen recording of the running app: autoplays unless motion is reduced. */
export function Recording({
  id,
  className,
}: {
  id: RecordingId
  className?: string
}) {
  const { windowTitle, caption, label } = RECORDINGS[id]
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    () => true
  )
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  function togglePlayback() {
    const video = videoRef.current
    if (!video) {
      return
    }
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <PreviewWindow
        title={windowTitle}
        badge="Screen recording"
        bodyClassName="relative bg-secondary"
      >
        <video
          ref={videoRef}
          aria-label={label}
          poster={`/recordings/${id}.webp`}
          autoPlay={!prefersReducedMotion}
          preload={prefersReducedMotion ? "none" : "auto"}
          muted
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="aspect-video w-full bg-secondary object-contain"
        >
          <source src={`/recordings/${id}.mp4`} type="video/mp4" />
        </video>
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={
            isPlaying
              ? `Pause recording: ${caption}`
              : `Play recording: ${caption}`
          }
          className={cn(
            "absolute flex items-center justify-center rounded-lg border bg-background/75 text-foreground backdrop-blur-lg outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50",
            isPlaying
              ? "right-3 bottom-3 size-9 opacity-70 hover:opacity-100 focus-visible:opacity-100"
              : "inset-0 m-auto size-14"
          )}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-5" />
          )}
        </button>
      </PreviewWindow>
      <figcaption className="text-sm text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  )
}
