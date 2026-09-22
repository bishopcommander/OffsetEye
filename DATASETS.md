# OffsetEye / eRTMAC-NWIS — Datasets & Data Governance

## Overview

OffsetEye uses real operational and technical drilling data from the **Equinor Volve Field** (North Sea, Block 15/9) alongside metadata from the **Norwegian Offshore Directorate (Sodir / NPD FactPages)** as a technical analogue for Oil India Limited (OIL) offset wells.

---

## 📂 Datasets in this Repository

### 1. `Volve_Well_technical_data/`
Contains real engineering and operational records for 26 distinct Volve wellbores:
- **`Daily Drilling Report - XML Version/`** (Tracked in Git):
  - **1,759 daily drilling reports in WITSML XML schema**.
  - Parsed deterministically by `server/scripts/import_real_data.js` to extract **3,016 real operational events** (mud loss, stuck pipe, kicks, overpressure, equipment failures/NPT, cementing, fishing operations) without requiring external LLM APIs.
- **`Daily Drilling report - PDF Version/`** and **`HTML Version/`**:
  - Daily narrative logs and engineer shift notes.
- **`WellWellbore/`**:
  - Directional survey reports, well summaries, and wellbore plans for wells (F-1, F-4, F-5, F-8, F-12, F-14, F-15, 15/9-19, etc.).
- **`Site/` & `Site_TemplateSlot/`**:
  - Platform slot coordinates and subsea template locations.

### 2. `Volve_Reports/`
- **`Volve PUD .pdf`** (Tracked in Git): Plan for Development and Operation of the Volve field.
- **`license.txt`**: Equinor Open Data License agreement.

---

## 🚫 Excluded from Git Due to GitHub File & Repo Limits

GitHub enforces a **100 MB per-file limit** and recommends repositories stay under **1 GB - 2 GB**. The following large original raw files are excluded via `.gitignore`:

| File / Directory | Size | Reason & Where to Download |
|---|---|---|
| `Volve_Reports/Reports/Discovery_report.pdf` | 182 MB | Exceeds GitHub's 100 MB limit. Available via Equinor Open Data Village. |
| `Volve_Well_technical_data/.../EDM.XML/` | 275 MB | Contains `Volve F.edm.xml` (211 MB). Landmark EDM database export. |
| `Volve_WITSML Realtime drilling data/` | 18.0 GB (20,087 files) | Massive high-frequency raw sensor logs (depth & time logs across all wells). Exceeds GitHub repository quota. |
| `*.zip` Archives | 169 MB – 2.47 GB | Compressed archives of the raw sources. |

### How to Access the Full 18 GB Raw WITSML Dataset
If you require the complete high-frequency time/depth sensor data:
1. Visit the **Equinor Open Data** portal: [Equinor Volve Data Village](https://www.equinor.com/energy/volve-data-sharing).
2. Download `WITSML Realtime drilling data.zip` and extract into `./Volve_WITSML Realtime drilling data/`.

---

## ⚡ How to Import Data into PostgreSQL

OffsetEye includes an automated deterministic parser to populate the database directly from the included XML reports:

```bash
# 1. Ensure PostgreSQL is running and your .env has correct credentials
cp .env.example .env

# 2. Run the deterministic data importer
node server/scripts/import_real_data.js
```

This imports:
- **15 real Volve wells** with accurate WGS84 coordinates.
- **3,016 classified drilling events** categorized into 8 risk types.
- **853 real operational parameter records** (mud density, ROP).
- Computes risk summaries and depth windows for predictive offset-well alerts.
