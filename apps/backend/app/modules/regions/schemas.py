from pydantic import BaseModel


class Region(BaseModel):
    """A department Cropilot can scope its analyses to, anchored on one reference point."""

    id: str
    name: str
    province: str
    department: str
    latitude_deg: float
    longitude_deg: float
    # The department where every model was tested first; onboarding suggests it.
    is_reference_case: bool
    # A known gap in the data or the models here that needs local review.
    known_limit: str | None
