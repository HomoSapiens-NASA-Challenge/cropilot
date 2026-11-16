"""Read-only tools. Selection and numerical evidence stay in existing domain services."""

import json
from dataclasses import dataclass, field

from openai.types.responses import FunctionToolParam
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.modules.assistant.schemas import EvidenceCard
from app.modules.cases import service as cases_service
from app.modules.cases.schemas import SourceRef
from app.modules.mcp import service as evidence_service
from app.modules.rotation_planner import service as planner_service


class ToolArguments(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class WaterArguments(ToolArguments):
    depth_m: float = Field(gt=0, le=5)
    initial_water_fraction: float = Field(ge=0, le=1)
    summer_shift_days: int = Field(ge=-60, le=60)


class FieldArguments(ToolArguments):
    field_id: str | None = Field(max_length=80)


class EvidenceError(Exception):
    """The requested evidence cannot be safely supplied."""


def tool_definitions(has_run: bool) -> list[FunctionToolParam]:
    definitions = [
        ("list_cases", "List available public regions and coverage.", ToolArguments),
        (
            "find_analog_years",
            "Read published analog years for the selected region.",
            ToolArguments,
        ),
        (
            "compare_rotations",
            "Compare published rotations and exact water scenarios in the selected region. "
            "When unspecified, explicitly use 1 m depth, 0.5 initial reserve and 0 days shift. "
            "Unsupported combinations return an error with available choices; never substitute.",
            WaterArguments,
        ),
        (
            "get_field_evidence",
            "Read public satellite evidence. Null field_id selects the water reference field.",
            FieldArguments,
        ),
    ]
    if has_run:
        definitions.append(
            (
                "get_planner_result",
                "Read the authenticated user's selected planner run.",
                ToolArguments,
            )
        )
    return [
        {
            "type": "function",
            "name": name,
            "description": description,
            "parameters": schema.model_json_schema(),
            "strict": True,
        }
        for name, description, schema in definitions
    ]


@dataclass
class EvidenceSession:
    zone_id: str
    owner_id: str | None = None
    run_id: str | None = None
    sources: dict[str, SourceRef] = field(default_factory=dict)
    cards: list[EvidenceCard] = field(default_factory=list)
    tools_used: list[str] = field(default_factory=list)

    def context(self) -> str:
        bundle = cases_service.get_case(self.zone_id)
        self.sources.update((source.id, source) for source in bundle.sources)
        return bundle.model_dump_json(
            include={
                "zone_id",
                "zone_name",
                "province",
                "decision",
                "generated_utc",
                "modules",
                "limits",
                "glossary",
                "sources",
            }
        )

    def execute(self, name: str, arguments: str) -> str:
        if len(arguments) > 2000:
            raise EvidenceError("Tool arguments are too large")
        if name not in self.tools_used:
            self.tools_used.append(name)
        try:
            result = self._execute(name, arguments)
        except (ValidationError, evidence_service.InvalidSelectionError) as error:
            # Validation messages describe allowed values, never credentials or private state.
            return json.dumps({"error": str(error), "status": "invalid_selection"})
        if len(result.encode("utf-8")) > 128 * 1024:
            raise EvidenceError("Evidence is too large; ask a narrower question")
        return result

    def _execute(self, name: str, arguments: str) -> str:
        if name == "compare_rotations":
            selection = WaterArguments.model_validate_json(arguments)
            data = evidence_service.compare_rotations(self.zone_id, **selection.model_dump())
            data.selection_note += (
                " Metric definitions: robustness median_mm/minimum_mm/maximum_mm and "
                "deficit_vs_current_mm are differences from the current rotation, not absolute "
                "water deficits. Zero difference does not mean zero deficit. Lower modeled "
                "unmet demand does not establish water savings or lower water consumption. "
                "Absolute deficit is crop_et_deficit_mm for each three-campaign episode."
            )
            if data.water:
                water = data.water
                if not water.robustness:
                    data.selection_note += (
                        " No full-history comparison against the current rotation is published "
                        "for this selection. Calendar effects compare shifted with unshifted "
                        "sowing, a different reference."
                    )
                self.cards.append(
                    EvidenceCard(
                        title="Published water scenarios · three-campaign totals",
                        columns=[
                            "Start year",
                            "Strategy",
                            "ET deficit (mm)",
                            "Excess above capacity (mm)",
                        ],
                        rows=[
                            [
                                row.start_year,
                                row.strategy_id,
                                row.crop_et_deficit_mm,
                                row.excess_above_capacity_mm,
                            ]
                            for row in water.episodes
                        ],
                        provenance=water.meta.provenance,
                        scale=water.meta.scale,
                        note=(
                            f"Scenario: {selection.depth_m} m; initial reserve "
                            f"{selection.initial_water_fraction * 100:g}%; summer shift "
                            f"{selection.summer_shift_days} days. "
                            "Excess is not a flood probability. " + data.selection_note
                        ),
                        source_ids=water.meta.source_ids,
                    )
                )
                self.cards.append(
                    EvidenceCard(
                        title="Full-history paired water comparison",
                        columns=[
                            "Strategy",
                            "Episodes",
                            "Lower deficit",
                            "Equal",
                            "Higher deficit",
                            "Median difference (mm)",
                        ],
                        rows=[
                            [
                                r.strategy_id,
                                r.count,
                                r.lower_count,
                                r.equal_count,
                                r.higher_count,
                                r.median_mm,
                            ]
                            for r in water.robustness
                        ],
                        provenance=water.meta.provenance,
                        scale=water.meta.scale,
                        source_ids=water.meta.source_ids,
                        note="Difference from the current rotation at the exact selected settings. "
                        "Overlapping three-campaign episodes cover the full historical record, "
                        "not just the analog campaigns. Counts are descriptive, not probabilities.",
                    )
                )
            self.cards.append(
                EvidenceCard(
                    title="Published rotation alternatives",
                    columns=["Strategy", "Sequence", "Current"],
                    rows=[
                        [s.label, " → ".join(s.sequence), "Unconfirmed" if s.is_current else "No"]
                        for s in data.strategies
                    ],
                    provenance="scenario",
                    scale="department",
                    note="Current rotation needs local confirmation. "
                    "Water matches may be approximate.",
                    source_ids=data.margins_meta.source_ids,
                )
            )
            return data.model_dump_json()
        if name == "get_field_evidence":
            selection = FieldArguments.model_validate_json(arguments)
            data = evidence_service.get_field_evidence(self.zone_id, selection.field_id)
            reference = data.reference_field
            if reference and data.reference_meta:
                self.cards.append(
                    EvidenceCard(
                        title=f"Satellite evidence · field {reference.field_id}",
                        columns=["Month", "Mean NDVI", "Valid fraction"],
                        rows=[[r.month, r.ndvi_mean, r.valid_fraction] for r in reference.ndvi],
                        provenance=data.reference_meta.provenance,
                        scale=data.reference_meta.scale,
                        note=data.selection_note,
                        source_ids=data.reference_meta.source_ids,
                    )
                )
            return data.model_dump_json()
        ToolArguments.model_validate_json(arguments)
        if name == "list_cases":
            data = evidence_service.list_cases()
            self.sources.update((source.id, source) for source in data.sources)
            return data.model_dump_json()
        if name == "find_analog_years":
            data = evidence_service.find_analog_years(self.zone_id)
            years = data.years_like_this
            self.cards.append(
                EvidenceCard(
                    title="Published analog campaigns",
                    columns=["Campaign", "Rank", "ONI JAS", "Root wetness"],
                    rows=[
                        [r.campaign, r.analog_rank, r.oni_jas, r.soil_wetness_end_aug]
                        for r in years.campaigns
                    ],
                    provenance=years.signals.provenance,
                    scale=years.signals.scale,
                    source_ids=years.signals.source_ids,
                    note="Historical scenario. JAS ONI is published in October, after late August; "
                    "this retrospective selection is not an operational forecast.",
                )
            )
            return data.model_dump_json()
        if name == "get_planner_result":
            return self.planner_result()
        raise EvidenceError("Unknown tool")

    def planner_result(self) -> str:
        if self.owner_id is None or self.run_id is None:
            raise EvidenceError("Planner access requires an authenticated selected run")
        run = planner_service.get_rotation_plan(self.owner_id, self.run_id)
        if run.region_id != self.zone_id:
            raise EvidenceError("The selected run belongs to another region")
        if run.result:
            periods = sorted(
                {f"{p.test.first_year}-{p.test.last_year}" for p in run.result.policies}
            )
            self.sources["planner:run"] = SourceRef(
                id="planner:run",
                dataset=f"Cropilot rotation planner · run {run.run_id}",
                provider="Cropilot · rotation_sim",
                url=None,
                period="Held-out campaign start years: " + ", ".join(periods),
                location=run.region_id,
                nature="model",
                license=None,
            )
            if "get_planner_result" not in self.tools_used:
                self.cards.append(
                    EvidenceCard(
                        title="Held-out comparison: optimum minus baseline",
                        columns=[
                            "Baseline",
                            "Mean score difference",
                            "Interval low",
                            "Interval high",
                            "Conclusion",
                        ],
                        rows=[
                            [
                                r.baseline_policy_id,
                                r.mean_score_difference,
                                r.interval_low,
                                r.interval_high,
                                r.conclusion,
                            ]
                            for r in run.result.verdict.held_out
                        ],
                        provenance="modeled",
                        scale="department",
                        source_ids=["planner:run"],
                        note="Unitless score for this run's weights. Intervals compare the optimum "
                        "with each baseline, not RL with greedy. Bad-year margin is not food CVaR. "
                        "Bootstrap method: " + run.result.bootstrap.model_dump_json(),
                    )
                )
                self.tools_used.append("get_planner_result")
        # Exclude long traces, the policy grid and the per-campaign replays of every policy
        # (they alone exceed the evidence cap); keep split means, bad-year margins, baselines
        # and the held-out comparison with its uncertainty.
        return run.model_dump_json(
            exclude={
                "convergence": True,
                "result": {
                    "decisions": True,
                    "policies": {"__all__": {"train": {"campaigns"}, "test": {"campaigns"}}},
                },
            }
        )
