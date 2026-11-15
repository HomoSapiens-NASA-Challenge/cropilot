from app.modules.regions.schemas import Region

# The reference points of the rotation simulator (simulator/configs/fields.csv): one rural
# SoilGrids pixel per department, picked by hand by the team. They anchor the NASA POWER
# cell and the MAGyP department yields of each region; they are not surveyed fields.
# Known limits come from the simulator's checks against MAGyP yields (simulator/AGENTS.md).

_NORTH_MAIZE_LIMIT = (
    "Simulated maize does not follow MAGyP department yields here (2013/14 onward). "
    "Review maize results locally."
)

REGIONS: tuple[Region, ...] = (
    Region(
        id="pergamino",
        name="Pergamino",
        province="Buenos Aires",
        department="Pergamino",
        latitude_deg=-33.84,
        longitude_deg=-60.52,
        is_reference_case=True,
        known_limit=None,
    ),
    Region(
        id="marcos-juarez",
        name="Marcos Juárez",
        province="Córdoba",
        department="Marcos Juárez",
        latitude_deg=-32.65,
        longitude_deg=-62.05,
        is_reference_case=False,
        known_limit=None,
    ),
    Region(
        id="balcarce",
        name="Balcarce",
        province="Buenos Aires",
        department="Balcarce",
        latitude_deg=-37.80,
        longitude_deg=-58.20,
        is_reference_case=False,
        known_limit=None,
    ),
    Region(
        id="trenque-lauquen",
        name="Trenque Lauquen",
        province="Buenos Aires",
        department="Trenque Lauquen",
        latitude_deg=-35.92,
        longitude_deg=-62.68,
        is_reference_case=False,
        known_limit=None,
    ),
    Region(
        id="rio-cuarto",
        name="Río Cuarto",
        province="Córdoba",
        department="Río Cuarto",
        latitude_deg=-33.08,
        longitude_deg=-64.30,
        is_reference_case=False,
        known_limit=(
            "NASA POWER shows a near-normal 2022/23 here and misses the drought that cut "
            "MAGyP department yields that campaign."
        ),
    ),
    Region(
        id="parana",
        name="Paraná",
        province="Entre Ríos",
        department="Paraná",
        latitude_deg=-31.68,
        longitude_deg=-60.48,
        is_reference_case=False,
        known_limit=None,
    ),
    Region(
        id="anguil",
        name="Anguil",
        province="La Pampa",
        department="Capital",
        latitude_deg=-36.53,
        longitude_deg=-64.01,
        is_reference_case=False,
        known_limit=None,
    ),
    Region(
        id="charata",
        name="Charata",
        province="Chaco",
        department="Chacabuco",
        latitude_deg=-27.16,
        longitude_deg=-61.14,
        is_reference_case=False,
        known_limit=_NORTH_MAIZE_LIMIT,
    ),
    Region(
        id="quimili",
        name="Quimilí",
        province="Santiago del Estero",
        department="Moreno",
        latitude_deg=-27.63,
        longitude_deg=-62.42,
        is_reference_case=False,
        known_limit=_NORTH_MAIZE_LIMIT,
    ),
    Region(
        id="las-lajitas",
        name="Las Lajitas",
        province="Salta",
        department="Anta",
        latitude_deg=-24.68,
        longitude_deg=-64.15,
        is_reference_case=False,
        known_limit=_NORTH_MAIZE_LIMIT,
    ),
)
