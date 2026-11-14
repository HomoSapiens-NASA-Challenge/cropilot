"""Regional GWETROOT hindcasts; run only in the pinned Python 3.12 model environment."""

import argparse
import hashlib
import importlib.util
import json
import math
import sys
from datetime import date, timedelta
from importlib.metadata import version
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits

HORIZONS = (7, 14)
FEATURES = [
    "latitude_deg",
    "longitude_deg",
    "season_sin",
    "season_cos",
    "wetness_fraction",
    "wetness_lag1_fraction",
    "wetness_lag7_fraction",
    "wetness_lag14_fraction",
    "wetness_lag28_fraction",
    "wetness_mean7_fraction",
    "wetness_mean14_fraction",
    "wetness_mean28_fraction",
    "rain7_mm",
    "rain14_mm",
    "rain28_mm",
    "eto7_mm",
    "eto14_mm",
    "eto28_mm",
    "temperature7_c",
    "temperature28_c",
]
PERIODS = {
    "train": (1984, 2006),
    "validation": (2007, 2012),
    "calibration": (2013, 2016),
    "test": (2017, 2025),
}
NAMES = ("persistence", "climatology", "ridge", "hgb")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n")


def features(weather: pd.DataFrame, latitude: float, longitude: float) -> pd.DataFrame:
    """Every feature at t uses dates <= t; rolling windows are trailing and complete."""
    required = weather[["GWETROOT", "PRECTOTCORR", "ET0", "T2M"]]
    if (
        weather.empty
        or not weather.index.equals(pd.date_range(weather.index[0], weather.index[-1]))
        or not np.isfinite(required.to_numpy()).all()
    ):
        raise ValueError("Daily data must be complete, finite and chronological")
    if (
        not weather.GWETROOT.between(0, 1).all()
        or (weather.PRECTOTCORR < 0).any()
        or (weather.ET0 < 0).any()
    ):
        raise ValueError("Daily data outside physical bounds")
    frame = pd.DataFrame(index=weather.index)
    frame["latitude_deg"], frame["longitude_deg"] = latitude, longitude
    angle = 2 * np.pi * (pd.DatetimeIndex(weather.index).day_of_year - 1) / 365.25
    frame["season_sin"], frame["season_cos"] = np.sin(angle), np.cos(angle)
    frame["wetness_fraction"] = weather.GWETROOT
    for lag in (1, 7, 14, 28):
        frame[f"wetness_lag{lag}_fraction"] = weather.GWETROOT.shift(lag)
    for days in (7, 14, 28):
        frame[f"wetness_mean{days}_fraction"] = weather.GWETROOT.rolling(days).mean()
        frame[f"rain{days}_mm"] = weather.PRECTOTCORR.rolling(days).sum()
        frame[f"eto{days}_mm"] = weather.ET0.rolling(days).sum()
    for days in (7, 28):
        frame[f"temperature{days}_c"] = weather.T2M.rolling(days).mean()
    return frame[FEATURES]


def supervised(weather: pd.DataFrame, site: dict, horizon: int) -> pd.DataFrame:
    if horizon not in HORIZONS:
        raise ValueError("Unsupported horizon")
    frame = features(weather, site["lat"], site["lon"])
    frame["target"] = weather.GWETROOT.shift(-horizon)
    frame["zone_id"] = site["id"]
    frame["origin"] = weather.index
    frame["target_date"] = weather.index + pd.Timedelta(days=horizon)
    return frame.dropna().reset_index(drop=True)


def partition(frame: pd.DataFrame, period: str) -> pd.DataFrame:
    first, last = PERIODS[period]
    # Purge targets crossing boundaries, including the last 7/14 training days.
    mask = (frame.origin >= f"{first}-01-01") & (frame.target_date <= f"{last}-12-31")
    return frame.loc[mask].copy()


def estimator(name: str) -> Pipeline | HistGradientBoostingRegressor:
    if name == "ridge":
        return make_pipeline(StandardScaler(), Ridge(alpha=100))
    if name == "hgb":
        return HistGradientBoostingRegressor(
            max_iter=160,
            learning_rate=0.05,
            max_leaf_nodes=15,
            min_samples_leaf=50,
            l2_regularization=10,
            early_stopping=False,
            random_state=42,
        )
    raise ValueError("Unknown learned estimator")


def fit_candidates(train: pd.DataFrame) -> dict:
    climate = train.groupby(["zone_id", train.target_date.dt.month]).target.mean().to_dict()
    models = {"climatology": climate, "persistence": None}
    change = train.target.to_numpy() - train.wetness_fraction.to_numpy()
    for name in ("ridge", "hgb"):
        model = estimator(name)
        model.fit(train[FEATURES], change)
        models[name] = model
    return models


def predict_candidate(
    model: Pipeline | HistGradientBoostingRegressor | dict | None, name: str, frame: pd.DataFrame
) -> np.ndarray:
    if name == "persistence":
        result = frame.wetness_fraction.to_numpy()
    elif name == "climatology":
        if not isinstance(model, dict):
            raise ValueError("Expected fitted climatology")
        result = np.array(
            [model[(z, m)] for z, m in zip(frame.zone_id, frame.target_date.dt.month, strict=True)]
        )
    else:
        if not isinstance(model, (Pipeline, HistGradientBoostingRegressor)):
            raise ValueError("Expected fitted estimator")
        result = frame.wetness_fraction.to_numpy() + model.predict(frame[FEATURES])
    return np.clip(result, 0, 1)


def metrics(truth: np.ndarray, prediction: np.ndarray) -> dict:
    error = truth - prediction
    return {"mae": float(np.abs(error).mean()), "rmse": float(np.sqrt((error**2).mean()))}


def interval_radius(errors: np.ndarray) -> float:
    rank = min(len(errors), math.ceil((len(errors) + 1) * 0.9))
    return float(np.sort(errors)[rank - 1])


def year_bootstrap(test: pd.DataFrame, prediction: np.ndarray) -> dict:
    delta = np.abs(test.target - test.wetness_fraction) - np.abs(test.target - prediction)
    means = delta.groupby(test.origin.dt.year).mean().to_numpy()
    samples = np.random.default_rng(42).choice(means, (2000, len(means))).mean(axis=1)
    return {
        "mean_mae_improvement": float(means.mean()),
        "ci95": np.quantile(samples, [0.025, 0.975]).tolist(),
        "years": len(means),
        "replicates": 2000,
    }


def build_panels(data_dir: Path, upstream: Path) -> tuple[dict, list, dict]:
    """Reuse the checksum-verified water-v1 validator and FAO-56 implementation."""
    spec = importlib.util.spec_from_file_location("water_data", upstream / "enso_water/data.py")
    if spec is None or spec.loader is None:
        raise ValueError("Missing verified water-v1 source")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    panels = {h: [] for h in HORIZONS}
    sources = {}
    for site in module.SITES:
        path = data_dir / f"power_{site['id']}.json"
        weather, location = module.load_power(json.loads(path.read_text()))
        if not np.allclose(
            [location["latitude_deg"], location["longitude_deg"]],
            [site["lat"], site["lon"]],
            atol=1e-5,
            rtol=0,
        ):
            raise ValueError("NASA snapshot coordinates differ from registered point")
        sources[path.name] = {"sha256": digest(path), "days": len(weather)}
        for horizon in HORIZONS:
            panels[horizon].append(supervised(weather, site, horizon))
    combined = {h: pd.concat(rows, ignore_index=True) for h, rows in panels.items()}
    return combined, module.SITES, sources


def spatial_scores(train: pd.DataFrame, test: pd.DataFrame) -> list:
    rows = []
    for zone in sorted(test.zone_id.unique()):
        fit, held = train[train.zone_id != zone], test[test.zone_id == zone]
        model = estimator("hgb")
        model.fit(fit[FEATURES], (fit.target - fit.wetness_fraction).to_numpy())
        prediction = predict_candidate(model, "hgb", held)
        rows.append(
            {
                "zone_id": zone,
                "hgb": metrics(held.target.to_numpy(), prediction),
                "persistence": metrics(held.target.to_numpy(), held.wetness_fraction.to_numpy()),
            }
        )
    return rows


def run(data_dir: Path, upstream: Path, output: Path) -> None:
    if output.exists():
        raise ValueError("Use a new output directory; existing evidence is immutable")
    output.mkdir(parents=True)
    panels, sites, sources = build_panels(data_dir, upstream)
    metadata = {
        "schema_version": "moisture-v1",
        "status": "research_only",
        "source_vintage": "revised_history_not_as_issued",
        "features": FEATURES,
        "sites": sites,
        "periods": PERIODS,
        "source_files": sources,
        "source_code_sha256": digest(Path(__file__)),
        "versions": {
            name: version(name) for name in ("numpy", "pandas", "scipy", "scikit-learn", "joblib")
        },
    }
    bundle = {**metadata, "horizons": {}}
    report = {**metadata, "horizons": {}}
    example = None
    for horizon, panel in panels.items():
        parts = {name: partition(panel, name) for name in PERIODS}
        train, _valid, calibration, test = (parts[name] for name in PERIODS)
        models = fit_candidates(train)
        scores, predictions, radii = {}, {}, {}
        for name in NAMES:
            outputs = {
                part: predict_candidate(models[name], name, frame)
                for part, frame in parts.items()
                if part != "train"
            }
            scores[name] = {
                part: metrics(parts[part].target.to_numpy(), value)
                for part, value in outputs.items()
            }
            radius = interval_radius(np.abs(calibration.target - outputs["calibration"]))
            radii[name] = radius
            predicted = outputs["test"]
            low, high = np.clip(predicted - radius, 0, 1), np.clip(predicted + radius, 0, 1)
            scores[name]["interval90"] = {
                "radius": radius,
                "coverage": float(((test.target >= low) & (test.target <= high)).mean()),
                "mean_width": float((high - low).mean()),
            }
            scores[name]["improvement_vs_persistence"] = year_bootstrap(test, predicted)
            predictions[name] = predicted
        selected = min(NAMES, key=lambda name: scores[name]["validation"]["mae"])
        bundle["horizons"][horizon] = {"models": models, "selected": selected, "radii": radii}
        detail = test[["zone_id", "origin", "target_date", "target", "wetness_fraction"]].copy()
        for name, values in predictions.items():
            detail[name] = values
        detail.to_csv(output / f"predictions-{horizon}d.csv", index=False)
        grouped = []
        for keys in (["zone_id"], ["year"]):
            detail["year"] = detail.origin.dt.year
            for label, group in detail.groupby(keys[0]):
                grouped.append(
                    {
                        "group": keys[0],
                        "value": str(label),
                        "rows": len(group),
                        "scores": {
                            n: metrics(group.target.to_numpy(), group[n].to_numpy()) for n in NAMES
                        },
                    }
                )
        report["horizons"][horizon] = {
            "selected": selected,
            "scores": scores,
            "counts": {k: len(v) for k, v in parts.items()},
            "groups": grouped,
            "spatial_hgb_leave_one_zone_out": spatial_scores(train, test),
        }
        example = test[(test.zone_id == "pergamino") & (test.origin == "2025-11-01")].iloc[0]
        sys.stderr.write(f"{horizon}d selected {selected}: {scores[selected]['test']}\n")
    if example is None:
        raise ValueError("No example available")
    joblib.dump(bundle, output / "moisture-v1.joblib", compress=3)
    write_json(output / "metrics.json", report)
    request = {
        "schema_version": "moisture-v1",
        "source_vintage": metadata["source_vintage"],
        "zone_id": "pergamino",
        "data_end": "2025-11-01",
        "features": example[FEATURES].to_dict(),
    }
    write_json(output / "request.example.json", request)
    write_json(output / "response.example.json", predict(bundle, request))
    plot(report, output / "comparison.png")


def validate_request(bundle: dict, request: dict) -> pd.DataFrame:
    if set(request) != {"schema_version", "source_vintage", "zone_id", "data_end", "features"}:
        raise ValueError("Unexpected request fields")
    if (
        request["schema_version"] != "moisture-v1"
        or request["source_vintage"] != "revised_history_not_as_issued"
    ):
        raise ValueError("Unsupported schema or source vintage")
    origin = date.fromisoformat(request["data_end"])
    if origin.isoformat() != request["data_end"] or not 1984 <= origin.year <= 2025:
        raise ValueError("Only ISO dates within the evaluated historical period are supported")
    site = next((s for s in bundle["sites"] if s["id"] == request["zone_id"]), None)
    if site is None:
        raise ValueError("Unknown regional point")
    values = request["features"]
    if not isinstance(values, dict) or set(values) != set(FEATURES):
        raise ValueError("Expected exactly the documented features")
    if not all(type(v) in (float, int) and math.isfinite(v) for v in values.values()):
        raise ValueError("Features must be finite numeric values")
    for key, value in values.items():
        if key.endswith("fraction") and not 0 <= value <= 1:
            raise ValueError("Wetness must be a fraction between zero and one")
        if key.endswith("_mm") and value < 0:
            raise ValueError("Rain and reference ET cannot be negative")
        if key.startswith("temperature") and not -90 <= value <= 60:
            raise ValueError("Temperature must be in degrees Celsius")
    angle = 2 * np.pi * (origin.timetuple().tm_yday - 1) / 365.25
    if not np.allclose(
        [
            values["latitude_deg"],
            values["longitude_deg"],
            values["season_sin"],
            values["season_cos"],
        ],
        [site["lat"], site["lon"], np.sin(angle), np.cos(angle)],
        rtol=0,
        atol=1e-6,
    ):
        raise ValueError("Coordinates or season features do not match the request")
    return pd.DataFrame([values], columns=FEATURES)


def predict(bundle: dict, request: dict) -> dict:
    frame = validate_request(bundle, request)
    origin = date.fromisoformat(request["data_end"])
    response = {
        "schema_version": "moisture-v1",
        "status": "research_only",
        "provenance": "modeled",
        "zone_id": request["zone_id"],
        "data_end": origin.isoformat(),
        "target": "regional_root_zone_relative_saturation",
        "unit": "fraction",
        "source_vintage": request["source_vintage"],
        "availability": "Hindcast relative to last input date; publication latency unverified",
        "interval_method": "90% calibration residual band; temporal coverage not guaranteed",
        "predictions": [],
    }
    for horizon in HORIZONS:
        target_date = origin + timedelta(days=horizon)
        if target_date > date(2025, 12, 31):
            raise ValueError("Target extends beyond the evaluated historical period")
        frame["zone_id"] = request["zone_id"]
        frame["target_date"] = pd.to_datetime([target_date])
        info = bundle["horizons"][horizon]
        name = info["selected"]
        value = float(predict_candidate(info["models"][name], name, frame)[0])
        radius = info["radii"][name]
        response["predictions"].append(
            {
                "horizon_days": horizon,
                "target_date": target_date.isoformat(),
                "model": name,
                "wetness_fraction": value,
                "change_fraction": value - request["features"]["wetness_fraction"],
                "interval90_fraction": [max(0, value - radius), min(1, value + radius)],
            }
        )
    return response


def plot(report: dict, path: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    figure, axes = plt.subplots(1, 2, figsize=(10, 4.5), layout="constrained")
    for ax, horizon in zip(axes, HORIZONS, strict=True):
        scores = report["horizons"][horizon]["scores"]
        bars = ax.barh(
            NAMES,
            [scores[n]["test"]["mae"] * 100 for n in NAMES],
            color=[
                "#167d83" if n == report["horizons"][horizon]["selected"] else "#8390a0"
                for n in NAMES
            ],
        )
        ax.bar_label(bars, fmt="%.2f", padding=3)
        ax.set_title(f"{horizon}-day horizon")
        ax.set_xlabel("MAE in relative-saturation percentage points")
        ax.invert_yaxis()
        ax.spines[["top", "right"]].set_visible(False)
        ax.set_xlim(0, max(scores[n]["test"]["mae"] * 100 for n in NAMES) * 1.2)
    figure.suptitle(
        "Regional soil wetness · historical test 2017-2025\n"
        "Teal = validation-selected model; lower is better"
    )
    figure.savefig(path, dpi=170)
    plt.close(figure)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    train = commands.add_parser("train")
    train.add_argument("--data-dir", type=Path, required=True)
    train.add_argument("--upstream", type=Path, required=True)
    train.add_argument("--output", type=Path, required=True)
    inference = commands.add_parser("predict")
    inference.add_argument("bundle", type=Path)
    inference.add_argument("request", type=Path)
    args = parser.parse_args()
    with threadpool_limits(limits=2):
        if args.command == "train":
            run(args.data_dir, args.upstream, args.output)
        else:
            result = predict(joblib.load(args.bundle), json.loads(args.request.read_text()))
            sys.stdout.write(json.dumps(result, indent=2, allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
