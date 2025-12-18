from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Dict, List

from ..converter import convert_tif_to_geojson

DATASET_ROOT = Path(
    os.environ.get("ICE_DATASET_DIR", Path(__file__).resolve().parent.parent.parent.parent / "datasets")
).resolve()

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _normalise_date(value: str) -> str:
    if not DATE_PATTERN.match(value):
        raise ValueError("Date must be provided as YYYY-MM-DD.")
    return value.replace("-", "")


def scan_available_dates() -> List[str]:
    dates: List[str] = []
    for path in DATASET_ROOT.rglob("*.tif"):
        stem = path.stem
        m = re.search(r"(\d{8})", stem)
        if not m:
            continue
        y, mo, d = m.group(1)[:4], m.group(1)[4:6], m.group(1)[6:8]
        dates.append(f"{y}-{mo}-{d}")
    return sorted(set(dates))


def find_dataset_path(date_str: str) -> Path:
    token = _normalise_date(date_str)
    candidates = sorted(DATASET_ROOT.rglob(f"*{token}*.tif"))
    if not candidates:
        raise FileNotFoundError(f"No GeoTIFF found for {date_str} under {DATASET_ROOT}")
    if len(candidates) > 1:
        exact = [path for path in candidates if path.stem.startswith(token)]
        if exact:
            return exact[0]
    return candidates[0]


def get_ice_extent_geojson(date_str: str, radius_km: float) -> Dict:
    tif_path = find_dataset_path(date_str)
    return convert_tif_to_geojson(str(tif_path), radius_km=radius_km)


def get_datasets_for_year(year: int) -> List[Path]:
    year_dir = DATASET_ROOT / str(year)
    if not year_dir.exists():
        return []
    
    paths = sorted(year_dir.rglob("*.tif"))
    return paths
