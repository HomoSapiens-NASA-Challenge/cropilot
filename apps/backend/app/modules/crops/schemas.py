"""Per-field crop history and season status, read from a released crop-map file."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Zone = Literal["pergamino", "parana"]
StatusCode = Literal["ok", "watch", "alert", "check", "bare"]
PhaseCode = Literal["nino", "nina", "neutral"]
# NDVI by month, September to May.
MonthlyNdvi = list[float]
# Summer campaign, e.g. "25/26" for September 2025 to May 2026.
Campaign = Annotated[str, StringConstraints(pattern=r"^\d{2}/\d{2}$")]


class FiniteModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class CampaignRecord(FiniteModel):
    campaign: Campaign
    source: Literal["INTA", "model"]
    crop_code: int | None = Field(ge=0, le=8)
    crop: str
    purity: float = Field(ge=0, le=1)
    curve: MonthlyNdvi = Field(min_length=9, max_length=9)
    phase_code: PhaseCode | None
    phase: str | None
    oni: float | None
    vigor: float
    zone_vigor: float | None
    gap: float | None
    lag: int | None
    even: float | None = Field(ge=0, le=1)
    zone_curve: MonthlyNdvi | None = Field(min_length=9, max_length=9)


class FieldProperties(FiniteModel):
    id: str = Field(pattern=r"^[LN]\d+$")
    name: str
    own: bool
    farm: str | None = None
    ha: float = Field(gt=0)
    status_code: StatusCode
    status: str
    reason: str
    # Latest crop, also when the status is `check` or `bare`.
    crop: str
    confidence: float | None = Field(ge=0, le=1)
    history: list[CampaignRecord] = Field(min_length=1)


class PolygonGeometry(FiniteModel):
    type: Literal["Polygon"]
    # Longitude, latitude (EPSG:4326).
    coordinates: list[list[tuple[float, float]]]


class CropField(FiniteModel):
    type: Literal["Feature"]
    geometry: PolygonGeometry
    properties: FieldProperties


class EnsoPhase(FiniteModel):
    phase_code: PhaseCode
    phase: str
    oni: float


class CurrentSeason(FiniteModel):
    campaign: Campaign
    phase_code: PhaseCode
    phase: str
    strength: str
    oni: float


class FieldMapMeta(FiniteModel):
    zone: Zone
    lang: Literal["en"]
    campaigns: list[Campaign]
    latest: Campaign
    farm: str
    # The demonstration farm (fields with `own`) is made up; every other value is computed.
    farm_is_synthetic: Literal[True]
    enso: dict[Campaign, EnsoPhase]
    current: CurrentSeason
    sources: list[str]


class FieldMap(FiniteModel):
    type: Literal["FeatureCollection"]
    meta: FieldMapMeta
    features: list[CropField]
