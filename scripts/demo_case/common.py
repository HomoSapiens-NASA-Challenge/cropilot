"""Names shared by the builder modules: zones, strategies, ENSO phases and campaign labels."""

# Market pipeline zone key (hub `market.config.ZONES`) -> region slug of the Cropilot catalog.
ZONE_IDS = {
    "Pergamino": "pergamino",
    "MarcosJuarez": "marcos-juarez",
    "Parana": "parana",
    "TrenqueLauquen": "trenque-lauquen",
    "RioCuarto": "rio-cuarto",
    "Balcarce": "balcarce",
    "Anguil": "anguil",
    "Charata": "charata",
    "Quimili": "quimili",
    "LasLajitas": "las-lajitas",
}

# Bundle strategy ids, in display order, and the market rotation each one is computed with.
STRATEGY_IDS = (
    "maize-soy-soy",
    "maize-soy",
    "wheat-soy2-maize-soy",
    "continuous-soy",
    "cover-soy",
)
MARKET_ROTATION = {
    "maize-soy-soy": "maiz-soja-soja",
    "maize-soy": "maiz-soja",
    "wheat-soy2-maize-soy": "trigo/soja2-maiz-soja",
    "continuous-soy": "soja continua",
    "cover-soy": "cobertura/soja",
}
BUNDLE_STRATEGY = {rotation: strategy for strategy, rotation in MARKET_ROTATION.items()}
CURRENT_STRATEGY = "maize-soy-soy"

# The market pipeline writes the phase as a label; the contract uses an id.
PHASE_ID = {
    "strong El Niño": "strong_el_nino",
    "El Niño": "el_nino",
    "neutral": "neutral",
    "La Niña": "la_nina",
}
PHASE_LABEL = {
    "strong_el_nino": "strong El Niño",
    "el_nino": "El Niño",
    "neutral": "neutral",
    "la_nina": "La Niña",
}

# Two margins within this many USD/ha are a tie, as in the market pipeline.
TIE_USD_HA = 0.5


def campaign_label(start_year: int) -> str:
    """1997 -> '1997/98'."""
    return f"{start_year}/{(start_year + 1) % 100:02d}"


def start_year(label: str) -> int:
    """'1997/98' -> 1997."""
    return int(label[:4])


def scenario_id(label: str) -> str:
    """The id shared by every module for one analog campaign."""
    return f"analog:{label}"


def join_labels(labels: list[str]) -> str:
    """'a', 'a and b', 'a, b and c'."""
    if len(labels) <= 1:
        return "".join(labels)
    return f"{', '.join(labels[:-1])} and {labels[-1]}"
