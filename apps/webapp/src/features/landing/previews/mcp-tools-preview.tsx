import { PreviewWindow } from "@/features/landing/previews/preview-window"
import { useI18n } from "@/lib/i18n"

// The four tools the public MCP server lists, with their inputs (docs/mcp.md).
const TOOLS = [
  { name: "list_cases", input: "no input" },
  { name: "find_analog_years", input: "zone_id" },
  {
    name: "compare_rotations",
    input: "zone_id, depth_m, initial_water_fraction, summer_shift_days",
  },
  { name: "get_field_evidence", input: "zone_id, field_id" },
] as const

export function McpToolsPreview({ className }: { className?: string }) {
  const { t } = useI18n("landing")
  return (
    <PreviewWindow
      title="cropilot · /api/mcp"
      badge={t("Tool list")}
      className={className}
    >
      <div className="flex flex-col gap-4">
        <p className="font-mono text-xs text-muted-foreground">
          {t("tools/list · Streamable HTTP · read-only, no key")}
        </p>
        <ul className="flex flex-col divide-y rounded-lg border bg-background/70">
          {TOOLS.map((tool) => (
            <li
              key={tool.name}
              className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span className="font-mono text-sm font-medium">{tool.name}</span>
              <span className="font-mono text-xs text-muted-foreground sm:text-right">
                {tool.input}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {t(
            "compare_rotations also returns an interactive card for clients that support MCP Apps."
          )}
        </p>
      </div>
    </PreviewWindow>
  )
}
