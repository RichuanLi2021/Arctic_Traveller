from pathlib import Path
import re
import numpy as np
import rasterio

# Training is done for years between 2015 to 2025 for the training speed and the laptop's capacity limits, can also be done via Colab for more accurate result.
YEAR_START = 2015
YEAR_END = 2025
ALPHA = 0.01
GAMMA = 1.0

# Resolve dataset root relative to this file so running from backend/ works
DATA_ROOT = Path(__file__).resolve().parent / "datasets" / "all_source"
OUT_PATH = Path(__file__).resolve().parent / "datasets" / "trained_data" / "rbf_model_2015_2025_spatiotemporal.npz"


def _inside_range(year: int) -> bool:
    return YEAR_START <= year <= YEAR_END

def parse_year_month(path: Path):
    m = re.search(r"(\d{4})(\d{2})\d{2}", path.stem)
    if not m:
        raise ValueError(f"Cannot parse date from {path.name}")
    return int(m.group(1)), int(m.group(2))

if not DATA_ROOT.exists():
    raise SystemExit(f"Dataset root not found at {DATA_ROOT}")

tif_paths = []
for p in sorted(DATA_ROOT.rglob("*.tif")):
    y, _ = parse_year_month(p)
    if _inside_range(y):
        tif_paths.append(p)

if not tif_paths:
    raise SystemExit(f"No GeoTIFFs found in {DATA_ROOT} for years {YEAR_START}-{YEAR_END}")

years, months, rows = [], [], []
valid_mask = None
transform = None
crs = None

for p in tif_paths:
    with rasterio.open(p) as src:
        band = src.read(1)
        nodata = src.nodata
        if transform is None:
            transform = src.transform
            crs = src.crs
        if valid_mask is None:
            valid_mask = np.ones_like(band, dtype=bool)
            if nodata is not None:
                valid_mask &= band != nodata
        y = (band == 1).astype(np.float32)
        rows.append(y[valid_mask])
    y_, m_ = parse_year_month(p)
    years.append(y_)
    months.append(m_)

Y = np.stack(rows, axis=0)
years = np.array(years)
months = np.array(months)
H, W = valid_mask.shape

# temporal features
year_norm = (years - years.min()) / max(1, (years.max() - years.min()))
month_sin = np.sin(2 * np.pi * months / 12.0)
month_cos = np.cos(2 * np.pi * months / 12.0)
t = np.stack([year_norm, month_sin, month_cos], axis=1) 

def rbf(x1, x2, gamma):
    diff = x1[:, None, :] - x2[None, :, :]
    dist2 = (diff ** 2).sum(axis=2)
    return np.exp(-gamma * dist2)

K = rbf(t, t, GAMMA)
A = K + ALPHA * np.eye(len(K))

# solve for B then store weights = B.T
B = np.linalg.solve(A, Y)
weights = B.T 

transform_arr = np.array([transform.a, transform.b, transform.c, transform.d, transform.e, transform.f], dtype=np.float64)

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
np.savez(
    OUT_PATH,
    weights=weights,
    valid_mask=valid_mask.astype(bool),
    years=years,
    months=months,
    alpha=ALPHA,
    gamma=GAMMA,
    H=H,
    W=W,
    transform=transform_arr,
    crs=str(crs),
)
print(f"Saved model to {OUT_PATH}")
