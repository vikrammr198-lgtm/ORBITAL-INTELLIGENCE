from pathlib import Path
import json
import math
import sys
from typing import Any, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import satellite_transformers  # noqa: E402,F401 - required for joblib unpickling

MODEL_PATH = BASE_DIR / "satellite_risk_model_final.pkl"
FEATURE_IMPORTANCE_PATH = BASE_DIR / "feature_importance.csv"
DATA_DIR = Path(__file__).resolve().parent / "data"
EVENTS_CSV_PATH = DATA_DIR / "conjunction_events_early.csv"
DATASET_STATS_PATH = DATA_DIR / "dataset_stats.json"
FEATURE_SCHEMA_PATH = DATA_DIR / "feature_schema.json"
TIMELINES_PATH = DATA_DIR / "event_timelines.json"

artifact = joblib.load(MODEL_PATH)
model = artifact["model"]
THRESHOLD = float(artifact["threshold"])
MODEL_NAME = str(artifact["model_name"])

# Original 102 model input columns
FEATURE_COLUMNS = list(model.feature_names_in_)

# Load extracted real dataset views (read-only)
events_df = pd.read_csv(EVENTS_CSV_PATH) if EVENTS_CSV_PATH.exists() else pd.DataFrame()
dataset_stats = json.loads(DATASET_STATS_PATH.read_text(encoding="utf-8")) if DATASET_STATS_PATH.exists() else {}
feature_schema = json.loads(FEATURE_SCHEMA_PATH.read_text(encoding="utf-8")) if FEATURE_SCHEMA_PATH.exists() else {"features": [], "presets": []}
event_timelines = json.loads(TIMELINES_PATH.read_text(encoding="utf-8")) if TIMELINES_PATH.exists() else {}
feature_importance_df = (
    pd.read_csv(FEATURE_IMPORTANCE_PATH) if FEATURE_IMPORTANCE_PATH.exists() else pd.DataFrame(columns=["Feature", "Importance"])
)


def _clean_value(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if math.isnan(float(val)) or math.isinf(float(val)):
            return None
        return float(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    if pd.isna(val):
        return None
    return val


def _row_summary(row: pd.Series) -> dict[str, Any]:
    return {
        "event_id": int(row["event_id"]),
        "mission_id": int(row["mission_id"]),
        "time_to_tca": round(float(row["time_to_tca"]), 4),
        "risk": round(float(row["risk"]), 4),
        "final_risk": round(float(row["final_risk"]), 4),
        "high_risk": int(row["high_risk"]),
        "max_risk_estimate": _clean_value(row.get("max_risk_estimate")),
        "max_risk_scaling": _clean_value(row.get("max_risk_scaling")),
        "miss_distance": _clean_value(row.get("miss_distance")),
        "relative_speed": _clean_value(row.get("relative_speed")),
        "mahalanobis_distance": _clean_value(row.get("mahalanobis_distance")),
        "c_object_type": str(row.get("c_object_type", "UNKNOWN")),
        "t_j2k_sma": _clean_value(row.get("t_j2k_sma")),
        "t_j2k_ecc": _clean_value(row.get("t_j2k_ecc")),
        "t_j2k_inc": _clean_value(row.get("t_j2k_inc")),
        "t_h_apo": _clean_value(row.get("t_h_apo")),
        "t_h_per": _clean_value(row.get("t_h_per")),
        "c_j2k_sma": _clean_value(row.get("c_j2k_sma")),
        "c_j2k_ecc": _clean_value(row.get("c_j2k_ecc")),
        "c_j2k_inc": _clean_value(row.get("c_j2k_inc")),
        "c_h_apo": _clean_value(row.get("c_h_apo")),
        "c_h_per": _clean_value(row.get("c_h_per")),
        "geocentric_latitude": _clean_value(row.get("geocentric_latitude")),
        "azimuth": _clean_value(row.get("azimuth")),
        "elevation": _clean_value(row.get("elevation")),
        "F10": _clean_value(row.get("F10")),
        "AP": _clean_value(row.get("AP")),
    }


app = FastAPI(
    title="Orbital Intelligence — Satellite Conjunction Risk Prediction API",
    description="Machine learning API for early satellite conjunction risk prediction",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionInput(BaseModel):
    features: dict[str, Any]


@app.get("/")
def home():
    return {
        "message": "Satellite Risk Prediction API is running",
        "model": MODEL_NAME,
        "threshold": THRESHOLD,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True,
        "model": MODEL_NAME,
        "threshold": THRESHOLD,
        "feature_count": len(FEATURE_COLUMNS),
        "events_loaded": int(len(events_df)),
    }


@app.post("/predict")
def predict(data: PredictionInput):
    missing = [col for col in FEATURE_COLUMNS if col not in data.features]

    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required input features",
                "missing_features": missing,
            },
        )

    try:
        input_df = pd.DataFrame(
            [[data.features[col] for col in FEATURE_COLUMNS]],
            columns=FEATURE_COLUMNS,
        )

        probability = float(model.predict_proba(input_df)[0][1])
        prediction = int(probability >= THRESHOLD)

        return {
            "predicted_class": prediction,
            "classification": "HIGH RISK" if prediction == 1 else "LOW RISK",
            "high_risk_probability": round(probability, 6),
            "threshold": THRESHOLD,
            "model": MODEL_NAME,
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/overview")
def get_overview():
    if events_df.empty:
        raise HTTPException(status_code=503, detail="Dataset summary not loaded")

    top_high_risk = (
        events_df[events_df["high_risk"] == 1]
        .sort_values(["final_risk", "time_to_tca"], ascending=[False, True])
        .head(8)
    )
    notable_low_risk = (
        events_df[events_df["high_risk"] == 0]
        .sort_values("miss_distance", ascending=True)
        .head(4)
    )
    recent_events = [
        _row_summary(row) for _, row in pd.concat([top_high_risk, notable_low_risk]).iterrows()
    ]

    return {
        "stats": dataset_stats,
        "model_info": {
            "model_name": MODEL_NAME,
            "threshold": THRESHOLD,
            "raw_feature_count": len(FEATURE_COLUMNS),
            "transformed_feature_count": int(len(feature_importance_df)),
            "cutoff_days": 2,
            "status": "OPERATIONAL",
        },
        "recent_events": recent_events,
    }


@app.get("/api/events")
def list_events(
    search: Optional[str] = Query(default=None),
    risk_filter: str = Query(default="all", pattern="^(all|high|low)$"),
    object_type: str = Query(default="all"),
    mission_id: Optional[int] = Query(default=None),
    max_miss_distance: Optional[float] = Query(default=None),
    sort_by: str = Query(default="final_risk"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
):
    if events_df.empty:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    filtered = events_df

    if risk_filter == "high":
        filtered = filtered[filtered["high_risk"] == 1]
    elif risk_filter == "low":
        filtered = filtered[filtered["high_risk"] == 0]

    if object_type != "all":
        filtered = filtered[filtered["c_object_type"] == object_type]

    if mission_id is not None:
        filtered = filtered[filtered["mission_id"] == mission_id]

    if max_miss_distance is not None:
        filtered = filtered[filtered["miss_distance"] <= max_miss_distance]

    if search and search.strip():
        q = search.strip().lower()
        mask = (
            filtered["event_id"].astype(str).str.contains(q, regex=False)
            | filtered["mission_id"].astype(str).str.contains(q, regex=False)
            | filtered["c_object_type"].astype(str).str.lower().str.contains(q, regex=False)
        )
        filtered = filtered[mask]

    allowed_sorts = {
        "event_id",
        "mission_id",
        "time_to_tca",
        "risk",
        "final_risk",
        "miss_distance",
        "relative_speed",
        "mahalanobis_distance",
    }
    sort_col = sort_by if sort_by in allowed_sorts else "final_risk"
    filtered = filtered.sort_values(sort_col, ascending=(sort_dir == "asc"))

    total = int(len(filtered))
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    page_df = filtered.iloc[start : start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": [_row_summary(row) for _, row in page_df.iterrows()],
    }


@app.get("/api/events/{event_id}")
def get_event_detail(event_id: int):
    if events_df.empty:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    match = events_df[events_df["event_id"] == event_id]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    row = match.iloc[0]
    features = {col: _clean_value(row[col]) for col in FEATURE_COLUMNS}
    timeline = event_timelines.get(str(event_id), [])

    return {
        "summary": _row_summary(row),
        "features": features,
        "rtn_vectors": {
            "relative_position_r": _clean_value(row.get("relative_position_r")),
            "relative_position_t": _clean_value(row.get("relative_position_t")),
            "relative_position_n": _clean_value(row.get("relative_position_n")),
            "relative_velocity_r": _clean_value(row.get("relative_velocity_r")),
            "relative_velocity_t": _clean_value(row.get("relative_velocity_t")),
            "relative_velocity_n": _clean_value(row.get("relative_velocity_n")),
        },
        "timeline": timeline,
    }


@app.get("/api/features/schema")
def get_feature_schema():
    return {
        "feature_columns": FEATURE_COLUMNS,
        "threshold": THRESHOLD,
        "model": MODEL_NAME,
        "schema": feature_schema.get("features", []),
        "presets": feature_schema.get("presets", []),
    }


@app.get("/api/analytics")
def get_analytics():
    fi_records = [
        {"feature": str(r["Feature"]), "importance": round(float(r["Importance"]), 6)}
        for _, r in feature_importance_df.iterrows()
    ]

    return {
        "feature_importance": fi_records,
        "model_leaderboard": [
            {"model": "XGBoost", "threshold": 0.44, "precision": 0.2639, "recall": 0.7308, "f2_score": 0.5398, "selected": True},
            {"model": "Random Forest (Tuned)", "threshold": 0.50, "precision": 0.2326, "recall": 0.7692, "f2_score": 0.5263, "selected": False},
            {"model": "Gradient Boosting", "threshold": 0.50, "precision": 0.1575, "recall": 0.8269, "f2_score": 0.4470, "selected": False},
            {"model": "Logistic Regression", "threshold": 0.49, "precision": 0.0903, "recall": 0.7692, "f2_score": 0.3072, "selected": False},
        ],
        "final_test_evaluation": {
            "model": MODEL_NAME,
            "threshold": THRESHOLD,
            "test_samples": 2389,
            "high_risk_support": 65,
            "low_risk_support": 2324,
            "accuracy": 0.9163,
            "precision": 0.1973,
            "recall": 0.6769,
            "f1_score": 0.3056,
            "f2_score": 0.4555,
            "pr_auc": 0.3278,
            "roc_auc": 0.9118,
            "confusion_matrix": {
                "tn": 2145,
                "fp": 179,
                "fn": 21,
                "tp": 44,
            },
        },
        "dataset_stats": dataset_stats,
    }


@app.get("/api/orbital-scenes")
def get_orbital_scenes():
    if events_df.empty:
        raise HTTPException(status_code=503, detail="Dataset not loaded")

    high_risk_rows = (
        events_df[events_df["high_risk"] == 1]
        .sort_values("final_risk", ascending=False)
        .head(10)
    )
    low_risk_rows = (
        events_df[events_df["high_risk"] == 0]
        .sort_values("miss_distance", ascending=True)
        .head(8)
    )
    combined = pd.concat([high_risk_rows, low_risk_rows])

    scenes = []
    for idx, (_, row) in enumerate(combined.iterrows()):
        summary = _row_summary(row)
        # Deterministic simulated orbital angles for 3D visualization because ESA CDM dataset
        # provides SMA, eccentricity, inclination & RTN relative vectors without RAAN/arg-perigee TLEs.
        eid = int(row["event_id"])
        sim_raan_deg = round(((eid * 137.508) % 360.0), 2)
        sim_phase_deg = round(((eid * 53.17 + idx * 19.0) % 360.0), 2)
        scenes.append(
            {
                **summary,
                "relative_position_r": _clean_value(row.get("relative_position_r")),
                "relative_position_t": _clean_value(row.get("relative_position_t")),
                "relative_position_n": _clean_value(row.get("relative_position_n")),
                "relative_velocity_r": _clean_value(row.get("relative_velocity_r")),
                "relative_velocity_t": _clean_value(row.get("relative_velocity_t")),
                "relative_velocity_n": _clean_value(row.get("relative_velocity_n")),
                "simulated_raan_deg": sim_raan_deg,
                "simulated_phase_deg": sim_phase_deg,
            }
        )

    return {
        "visualization_note": "Orbital SMA, eccentricity, inclination, apogee/perigee altitudes, miss distance, and risk values are from actual ESA CDM records. Orbital plane RAAN and orbital phase angles are deterministically simulated for 3D visualization because full 6-element TLEs are not included in the dataset.",
        "scenes": scenes,
    }
