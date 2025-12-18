from __future__ import annotations

import re
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from ..core.converter import convert_tif_to_geojson, GeoDataConversionError
from ..core.services import (
    find_dataset_path,
    scan_available_dates,
    get_datasets_for_year,
    cached_prediction,
    PredictionError,
)

router = APIRouter(tags=["ice_extent"])
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@router.get("/ice_extent")
def ice_extent(
    date: str = Query(..., description="Date matching the GeoTIFF filename (YYYY-MM-DD)"),
    radius_km: float = Query(500, ge=0, description="Radial distance filter (kilometres)"),
):
    try:
        tif_path = find_dataset_path(date)
        feature_collection = convert_tif_to_geojson(str(tif_path), radius_km=radius_km)

        payload = {
            "date": date,
            "source": str(tif_path.resolve()),
            "radius_km": radius_km,
            "feature_collection": feature_collection,
        }
        return JSONResponse(payload)

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GeoDataConversionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected conversion error: {exc}") from exc


@router.get("/ice_extent/available_dates")
def available_dates():
    """Return all available dates discovered under the dataset root."""
    try:
        dates = scan_available_dates()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to scan datasets: {exc}") from exc
    return {"count": len(dates), "dates": dates}


@router.get("/ice_extent/by_year")
def ice_extent_by_year(
    year: int = Query(..., ge=1900, le=2100, description="4-digit year to load"),
    radius_km: float = Query(500, ge=0, description="Radial distance filter (kilometres)"),
):
    paths = get_datasets_for_year(year)
    if not paths:
        raise HTTPException(status_code=404, detail=f"No GeoTIFFs found for year {year}")

    items = []
    for tif_path in paths:
        m = re.search(r"(\d{8})", tif_path.stem)
        if not m:
            continue
        token = m.group(1)
        iso = f"{token[:4]}-{token[4:6]}-{token[6:8]}"
        try:
            feature_collection = convert_tif_to_geojson(str(tif_path), radius_km=radius_km)
        except Exception:
            continue
        items.append({
            "date": iso,
            "source": str(tif_path.resolve()),
            "feature_collection": feature_collection,
        })

    if not items:
        raise HTTPException(status_code=404, detail=f"No valid GeoTIFFs converted for year {year}")

    return {"year": year, "radius_km": radius_km, "days": items}


@router.get("/ice_extent/predict")
def predict_ice_extent(
    date: str = Query(..., description="Prediction date (YYYY-MM-DD)"),
    radius_km: float = Query(500, ge=0, description="Radial distance filter (kilometres)"),
    thresh: float = Query(0.5, ge=0.0, le=1.0, description="Threshold for ice probability"),
):
    """
    Predict sea ice extent for a given date.
    Returns a GeoJSON FeatureCollection of predicted ice locations.
    """
    if not DATE_PATTERN.match(date):
        raise HTTPException(status_code=400, detail="Date must be provided as YYYY-MM-DD.")
    
    try:
        year = int(date[:4])
        month = int(date[5:7])
        
        feature_collection = cached_prediction(year, month, thresh, radius_km)
        
    except PredictionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected prediction error: {exc}") from exc

    payload = {
        "date": date,
        "radius_km": radius_km,
        "threshold": thresh,
        "feature_collection": feature_collection,
    }
    return JSONResponse(payload)
