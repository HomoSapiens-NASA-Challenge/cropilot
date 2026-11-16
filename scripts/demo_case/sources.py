"""Every dataset, model and person behind a number of the demo case, as `case-v1` `SourceRef`s.

`select` returns only the sources a bundle actually cites, in a stable order.
"""

from app.modules.cases.schemas import SourceRef

HUB = "https://github.com/HomoSapiens-NASA-Challenge/hub"
# Pinned commits of the repository holding the market model, the RL results and the research
# notes: the base commit, and commit 6823a1f with the maize/soybean/soybean rotation and the
# `campaigns` export that the market runs used here need.
HUB_TOTO_COMMIT = "ca784c5"
MARKET_MODEL_URL = f"{HUB}/tree/6823a1f/research/ml-market-model"


def _source(
    id_: str,
    dataset: str,
    provider: str,
    url: str | None,
    period: str,
    location: str,
    nature: str,
    license_: str | None,
) -> SourceRef:
    return SourceRef.model_validate(
        {
            "id": id_,
            "dataset": dataset,
            "provider": provider,
            "url": url,
            "period": period,
            "location": location,
            "nature": nature,
            "license": license_,
        }
    )


_ALL: tuple[SourceRef, ...] = (
    _source(
        "nasa_power",
        "NASA POWER daily API, community AG: root-zone soil wetness (GWETROOT), temperature, rain",
        "NASA Langley Research Center, POWER Project",
        "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
        "1981-01-01 to 2026-11-11",
        "One point per zone at the head town of the department; a cell of about 55 km",
        "reanalysis",
        "Open NASA data",
    ),
    _source(
        "noaa_oni",
        "Oceanic Nino Index (ONI), three-month seasons",
        "NOAA Climate Prediction Center",
        "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
        "DJF 1950 to ASO 2026; the file holds revised values",
        "Nino 3.4 region of the Pacific (one global index)",
        "observation",
        "Public NOAA data",
    ),
    _source(
        "magyp_yields",
        "Estimaciones agricolas: planted and harvested area, production and yield by department",
        "Ministerio de Agricultura, Ganaderia y Pesca (MAGyP), Argentina",
        "https://datos.magyp.gob.ar/dataset/estimaciones-agricolas",
        "Campaigns 1969/70 to 2024/25 (file estimaciones-agricolas-2026-03.csv)",
        "Department (partido) of each zone",
        "observation",
        "CC BY 4.0",
    ),
    _source(
        "magyp_margins",
        "Margenes Resultados: costs, rent and gross margins by region (quarterly reports)",
        "MAGyP, Direccion de Analisis Economico",
        "https://www.magyp.gob.ar/sitio/areas/analisis_economico/margenes/",
        "Reports May 2020 to September 2026; the September 2026 cost structure is used",
        "MAGyP region of each zone (the department-to-region assignment is the team's)",
        "reference",
        None,
    ),
    _source(
        "a3_futures",
        "A3 Mercados (ex MATba-ROFEX) futures settlements: soybean, maize, wheat",
        "A3 Mercados, Centro de Estadisticas de Mercado",
        "https://cem.matbarofex.com.ar/",
        "1994 to 2026-11-13; only derived margins are published here",
        "Rosario (Buenos Aires for part of the early wheat and maize history)",
        "reference",
        "No open licence: reference only, raw prices are not redistributed",
    ),
    _source(
        "nasa_hls",
        "Harmonized Landsat Sentinel-2 (HLS) v2.0 surface reflectance, NDVI",
        "NASA, via the HLS project",
        "https://www.earthdata.nasa.gov/data/projects/hls",
        "2020-06 to 2026-11 (monthly samples)",
        "Pergamino, 20 x 20 km research region",
        "observation",
        "Open NASA data",
    ),
    _source(
        "inta_crop_map",
        "Mapa Nacional de Cultivos (national crop map), winter and summer maps",
        "INTA, Argentina",
        "https://doi.org/10.5281/zenodo.17652712",
        "Campaigns 2018/19 to 2024/25 (one Zenodo record per campaign)",
        "Pergamino, 20 x 20 km research region",
        "model",
        "CC BY 4.0",
    ),
    _source(
        "ftw",
        "Fields of The World (FTW) field boundaries, global map alpha",
        "Fields of The World project, hosted on Source Cooperative",
        "https://source.coop/ftw/global-data",
        "2025 boundaries",
        "Argentina; outlines are satellite estimates, not validated",
        "model",
        "CC BY 4.0",
    ),
    _source(
        "soilgrids",
        "SoilGrids modeled soil properties: water retention at 33 and 1500 kPa",
        "ISRIC - World Soil Information",
        "https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html",
        "Static global model",
        "One point inside the Pergamino reference footprint",
        "model",
        "CC BY 4.0",
    ),
    _source(
        "agronomist_interview",
        "Interview with a practising agronomist (WhatsApp, six questions)",
        "Ing. Agr. MBA Fernando Spelanzon (named with his authorization)",
        f"{HUB}/blob/toto/research/entrevista-agronomo.md",
        "2026-11-14",
        "South of Cordoba, central Buenos Aires province and the Bragado area",
        "agronomist_input",
        None,
    ),
    _source(
        "team_market_model",
        "Years-like-this market model: analog campaigns, yield anomalies, MAGyP gross margins",
        "Team HomoSapiens (research/ml-market-model)",
        MARKET_MODEL_URL,
        f"Campaigns 1981/82 to 2024/25; decision 2026-08-31; base commit {HUB_TOTO_COMMIT} of toto",
        "Ten reference zones, one MAGyP department each",
        "model",
        None,
    ),
    _source(
        "team_market_backtest",
        "Backtest of the analog-years method (research/ml-market.md, section 9)",
        "Team HomoSapiens",
        f"{HUB}/blob/toto/research/ml-market.md",
        "Target campaigns 1991/92 to 2024/25, k = 7, 307 campaigns",
        "Ten reference zones",
        "model",
        None,
    ),
    _source(
        "team_water_scenarios",
        "Pergamino water-balance scenarios v1: 1,170 daily runs, FAO-56 bucket",
        "Team HomoSapiens",
        "https://github.com/HomoSapiens-NASA-Challenge/cropilot/releases/tag/models-strategies-v1",
        "Start years 1984 to 2022, three campaigns each (June of the start year)",
        "Footprint 268949, Pergamino; weather from the NASA POWER cell",
        "model",
        None,
    ),
    _source(
        "team_crop_map",
        "Team crop classifier on NASA HLS (LightGBM and U-Net) and per-field diagnostics",
        "Team HomoSapiens",
        "https://github.com/HomoSapiens-NASA-Challenge/cropilot/blob/main/docs/crop-map.md",
        "2025/26 from the model (release crop-map-v1); 2020/21 to 2024/25 from the INTA map",
        "Pergamino and Paraná, two 20 x 20 km zones",
        "model",
        None,
    ),
    _source(
        "team_rl_mdp",
        "Rotation as a tabular MDP: dynamic programming and Q-learning results",
        "Team HomoSapiens (research/rl/rotation-mdp/RESULTS.md)",
        f"{HUB}/blob/toto/research/rl/rotation-mdp/RESULTS.md",
        "Run of 2026-11-14, campaigns 2000/01 to 2024/25",
        "Ten reference zones",
        "model",
        None,
    ),
    _source(
        "team_rl_lab",
        "Reinforcement-learning lab, first pass in Pergamino (research/rl.md)",
        "Team HomoSapiens",
        f"{HUB}/blob/toto/research/rl.md",
        "1984 to 2024",
        "Pergamino",
        "model",
        None,
    ),
    _source(
        "team_analog_approach",
        "Years-like-this approach note, with the 2017/18 counterexample",
        "Team HomoSapiens (research/enfoque-anios-como-este.md)",
        f"{HUB}/blob/toto/research/enfoque-anios-como-este.md",
        "2026-11-14",
        "Pergamino",
        "reference",
        None,
    ),
    _source(
        "previous_crop_uca",
        "Efecto sistema de produccion: soybean after a grass crop (about +10%)",
        "Universidad Catolica Argentina (UCA)",
        "https://repositorio.uca.edu.ar/bitstream/123456789/19561/1/efecto-sistema-produccion.pdf",
        "n/a",
        "Argentina, several environments",
        "reference",
        None,
    ),
    _source(
        "previous_crop_core",
        "San Jeronimo Sud trial: first-crop soybean +7-8% after maize (CORE 322642799)",
        "Document held by CORE; attribution to INTA Pergamino partly verified",
        "https://core.ac.uk/download/322642799.pdf",
        "Long-term trial",
        "San Jeronimo Sud, Santa Fe",
        "reference",
        None,
    ),
    _source(
        "cover_crop_cost_producir",
        "Cover-crop cost of about 60 to 80 USD/ha (nominal USD of 2021)",
        "Fundacion Producir Conservando (F. Oliverio), 2021-04-11",
        "https://producirconservando.org.ar/los-cultivos-de-cobertura-claves-para-intensificar-la-agricultura/",
        "2021",
        "Argentina",
        "reference",
        None,
    ),
    _source(
        "cover_crop_cost_lanacion",
        "Short-cycle rye cover crop at about 86 USD/ha (nominal USD of 2012)",
        "La Nacion (citing D. Estrada, Capelle Hnos.), 2012-06-09",
        "https://www.lanacion.com.ar/economia/campo/centeno-una-alternativa-viable-para-la-conservacion-del-suelo-nid1480129/",
        "2012",
        "Western Buenos Aires province",
        "reference",
        None,
    ),
    _source(
        "cover_crop_yield_restovich",
        "Soybean yield after cover crops did not differ from the control",
        "Restovich, Andriulo and Amendola (2011), Ciencia del Suelo 29(1), INTA Pergamino",
        "https://www.scielo.org.ar/scielo.php?pid=S1850-20672011000100007&script=sci_arttext",
        "Long-term trial",
        "INTA Pergamino",
        "reference",
        None,
    ),
    _source(
        "fao56",
        "Crop evapotranspiration: guidelines for computing crop water requirements (Paper 56)",
        "FAO",
        "https://www.fao.org/4/x0490e/x0490e00.htm",
        "1998",
        "Global method",
        "reference",
        None,
    ),
)

SOURCES: dict[str, SourceRef] = {source.id: source for source in _ALL}


def select(ids: set[str]) -> list[SourceRef]:
    """The cited sources, in catalog order. An unknown id is a bug in the builder."""
    unknown = sorted(ids - set(SOURCES))
    if unknown:
        raise KeyError(f"Unknown source ids: {', '.join(unknown)}")
    return [source for source in _ALL if source.id in ids]
