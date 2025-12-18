from __future__ import annotations

import os
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import rasterio
import torch
import geopandas as gpd
from rasterio.transform import xy as transform_xy
from shapely.geometry import Point


class PredictionError(RuntimeError):
    """Raised when model prediction or conversion to GeoJSON fails."""


MODEL_ROOT = Path(
    os.environ.get(
        "ICE_MODEL_DIR",
        Path(__file__).resolve().parent.parent.parent.parent / "datasets" / "trained_data",
    )
).resolve()
MODEL_PATH = MODEL_ROOT / "rbf_model_2015_2025_spatiotemporal.npz"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Global model state
_MODEL_DATA = {}

def _load_model():
    if _MODEL_DATA:
        return
    
    print(f"Using device: {DEVICE}")
    print(f"Loading model from: {MODEL_PATH}")

    if not MODEL_PATH.exists():
        raise PredictionError(f"Model file not found at {MODEL_PATH}")
    
    try:
        data = np.load(str(MODEL_PATH), allow_pickle=True)
        weights = torch.from_numpy(data["weights"]).to(DEVICE).float()
        valid_mask = data["valid_mask"].astype(bool)
        years_arr = data["years"]
        months_arr = data["months"]
        
        _MODEL_DATA["weights"] = weights
        _MODEL_DATA["valid_mask"] = valid_mask
        _MODEL_DATA["years"] = years_arr
        _MODEL_DATA["months"] = months_arr
        _MODEL_DATA["alpha"] = float(data.get("alpha", 0.0))
        _MODEL_DATA["gamma"] = float(data.get("gamma", 1.0))
        _MODEL_DATA["H"] = int(data["H"])
        _MODEL_DATA["W"] = int(data["W"])
        
        A, B, C, D, E, F = data["transform"].tolist()
        _MODEL_DATA["transform"] = rasterio.Affine(A, B, C, D, E, F)
        _MODEL_DATA["crs"] = rasterio.crs.CRS.from_string(str(data["crs"]))
        
        # Precompute t
        year_norm = (years_arr - years_arr.min()) / max(1, (years_arr.max() - years_arr.min()))
        month_sin = np.sin(2 * np.pi * months_arr / 12.0)
        month_cos = np.cos(2 * np.pi * months_arr / 12.0)
        t_features = np.stack([year_norm, month_sin, month_cos], axis=1)
        _MODEL_DATA["t"] = torch.tensor(t_features, dtype=torch.float32, device=DEVICE)

    except Exception as exc:
        raise PredictionError(f"Failed to load model from '{MODEL_PATH}': {exc}") from exc


def _rbf_kernel(x1: torch.Tensor, x2: torch.Tensor, gamma: float) -> torch.Tensor:
    diff = x1[:, None, :] - x2[None, :, :]
    dist2 = torch.sum(diff ** 2, dim=2)
    return torch.exp(-gamma * dist2)


def _get_temporal_features(date: datetime) -> torch.Tensor:
    years_arr = _MODEL_DATA["years"]
    year_norm_next = (date.year - years_arr.min()) / max(1, (years_arr.max() - years_arr.min()))
    month_sin_next = np.sin(2 * np.pi * date.month / 12.0)
    month_cos_next = np.cos(2 * np.pi * date.month / 12.0)
    return torch.tensor([[year_norm_next, month_sin_next, month_cos_next]], 
                       dtype=torch.float32, device=DEVICE)


def _predict_ice_mask(date: datetime, thresh: float = 0.5):
    _load_model()
    t = _MODEL_DATA["t"]
    t_next = _get_temporal_features(date)
    gamma = _MODEL_DATA["gamma"]
    weights = _MODEL_DATA["weights"]
    
    k_star = _rbf_kernel(t, t_next, gamma)
    preds = (weights @ k_star).squeeze(-1).detach().cpu().numpy()
    preds = np.clip(preds, 0, 1)

    H, W = _MODEL_DATA["H"], _MODEL_DATA["W"]
    valid_mask = _MODEL_DATA["valid_mask"]
    
    pred_prob = np.zeros((H, W), dtype=np.float32)
    pred_prob[valid_mask] = preds
    ice_mask = (pred_prob >= thresh) & valid_mask
    return ice_mask, pred_prob


def _filter_points(ice_mask: np.ndarray, pred_prob: np.ndarray, radius_km: float):
    transform = _MODEL_DATA["transform"]
    H, W = _MODEL_DATA["H"], _MODEL_DATA["W"]

    cols, rows = np.meshgrid(np.arange(W), np.arange(H))
    xs = transform.c + cols * transform.a + rows * transform.b
    ys = transform.f + cols * transform.d + rows * transform.e
    dist_km = np.sqrt(xs**2 + ys**2) / 1000.0
    
    mask = ice_mask & (dist_km > radius_km)
    rows, cols = np.where(mask)
    probs = pred_prob[rows, cols]
    
    xs_filtered, ys_filtered = transform_xy(transform, rows, cols)
    return xs_filtered, ys_filtered, probs


def _to_feature_collection(xs, ys, probs, date: datetime) -> Dict:
    points = [Point(x, y) for x, y in zip(xs, ys)]
    if not points:
        return {"type": "FeatureCollection", "features": []}

    gdf = gpd.GeoDataFrame(
        {
            "date": date.strftime("%Y-%m-%d"),
            "pred_prob": probs.astype(float)
        },
        geometry=points,
        crs=_MODEL_DATA["crs"]
    ).to_crs(epsg=4326)

    return json.loads(gdf.to_json())


@lru_cache(maxsize=128)
def cached_prediction(year: int, month: int, thresh: float, radius_km: float) -> Dict:
    # Ensure model loaded
    _load_model()
    date = datetime(year, month, 1)
    ice_mask, pred_prob = _predict_ice_mask(date, thresh)
    xs, ys, probs = _filter_points(ice_mask, pred_prob, radius_km)
    return _to_feature_collection(xs, ys, probs, date)
