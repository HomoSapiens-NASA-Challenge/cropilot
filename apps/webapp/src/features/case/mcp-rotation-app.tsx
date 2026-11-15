import { matchesWaterSettings, type WaterSettings } from "@cropilot/api"
import { App } from "@modelcontextprotocol/ext-apps"
import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { RotationCard } from "@/features/case/mcp-rotation-card"
import {
  type CardComparison,
  readComparison,
} from "@/features/case/mcp-rotation-schema"
import "@/index.css"

const app = new App(
  { name: "Cropilot rotation comparison", version: "1.0.0" },
  {},
  { autoResize: true }
)

function RotationApp() {
  const [data, setData] = useState<CardComparison | null>(null)
  const [pending, setPending] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState<WaterSettings | null>(null)
  const generation = useRef(0)

  useEffect(() => {
    if (window.parent === window) {
      setError("Open this card from an MCP Apps host connected to Cropilot.")
      return
    }
    let active = true
    app.ontoolresult = (result) => {
      generation.current += 1
      setPending(false)
      setRetry(null)
      try {
        if (result.isError) throw new Error("Tool failed")
        setData(readComparison(result.structuredContent))
        setError(null)
      } catch {
        setData(null)
        setError(
          "The host did not provide a valid rotation comparison. Ask it to call compare_rotations again."
        )
      }
    }
    app.ontoolcancelled = () => {
      generation.current += 1
      setPending(false)
      setError("The host cancelled the comparison.")
    }
    app.onhostcontextchanged = (context) =>
      document.documentElement.classList.toggle(
        "dark",
        context.theme === "dark"
      )
    app.onclose = () => {
      if (active) {
        generation.current += 1
        setPending(false)
        setInteractive(false)
        setError("The host connection closed. Reopen the card to reconnect.")
      }
    }
    app
      .connect()
      .then(() => {
        if (!active) return
        setInteractive(Boolean(app.getHostCapabilities()?.serverTools))
        document.documentElement.classList.toggle(
          "dark",
          app.getHostContext()?.theme === "dark"
        )
      })
      .catch(() => {
        if (active)
          setError(
            "Could not connect to the MCP Apps host. Reopen the card to retry."
          )
      })
    return () => {
      active = false
      generation.current += 1
      void app.close()
    }
  }, [])

  async function changeSettings(settings: WaterSettings) {
    if (!data || pending) return
    const current = ++generation.current
    setPending(true)
    setError(null)
    setRetry(settings)
    try {
      const result = await app.callServerTool({
        name: "compare_rotations",
        arguments: { zone_id: data.context.zone_id, ...settings },
      })
      if (current !== generation.current) return
      if (result.isError) throw new Error("Tool failed")
      const next = readComparison(result.structuredContent)
      if (next.context.zone_id !== data.context.zone_id)
        throw new Error("Unexpected region")
      if (!matchesWaterSettings(next.requested_water_selection, settings)) {
        throw new Error("Unexpected water settings")
      }
      setData(next)
      setRetry(null)
    } catch {
      if (current === generation.current)
        setError(
          "Could not update the scenario. The last successful result is still shown; the requested change was not applied."
        )
    } finally {
      if (current === generation.current) setPending(false)
    }
  }

  async function openSource(url: string) {
    if (!/^https?:\/\//i.test(url)) {
      setError("This source URL cannot be opened.")
      return
    }
    try {
      const result = await app.openLink({ url })
      if (result.isError) throw new Error("Host refused link")
    } catch {
      setError(
        "The host could not open this source. Its title, period and location remain in Sources and limits."
      )
    }
  }

  return (
    <>
      {pending && (
        <p
          role="status"
          className="mx-auto max-w-3xl border-b bg-muted p-4 text-sm"
        >
          Loading the selected scenario… Previous results remain visible.
        </p>
      )}
      {error && (
        <div role="alert" className="mx-auto max-w-3xl border-b p-4 text-sm">
          <p>{error}</p>
          {retry && interactive && (
            <button
              type="button"
              disabled={pending}
              onClick={() => void changeSettings(retry)}
              className="mt-2 min-h-11 rounded-lg border px-4 text-primary"
            >
              Retry scenario
            </button>
          )}
        </div>
      )}
      {data ? (
        <RotationCard
          key={data.context.zone_id}
          data={data}
          pending={pending}
          interactive={interactive}
          onSettings={(settings) => void changeSettings(settings)}
          onSource={(url) => void openSource(url)}
        />
      ) : (
        !error && (
          <p role="status" className="p-6 text-sm text-muted-foreground">
            Waiting for Cropilot evidence from the host…
          </p>
        )
      )}
    </>
  )
}

const root = document.getElementById("root")
if (!root) throw new Error("Missing MCP App root")
createRoot(root).render(<RotationApp />)
