# ORBITAL INTELLIGENCE
### Early Prediction of High-Risk Satellite Conjunction Events Using Machine Learning

**ORBITAL INTELLIGENCE** is an academic research prototype for exploring early screening of satellite conjunction events. It combines a trained XGBoost classification pipeline, a FastAPI backend, prepared conjunction-event data, and a React/TypeScript interface with 3D orbital visualisation.

> **Important:** This is an academic prototype, not an operational collision-avoidance system. Its predictions and visualisations must not be used as the sole basis for spacecraft manoeuvres or safety decisions.

---

## Project at a glance

- **Problem:** Prioritising potentially high-risk satellite conjunction events for further analysis.
- **Data:** CDM-derived conjunction records.
- **Prediction model:** Saved XGBoost pipeline.
- **Early-warning selection:** Eligible observations at least **2 days before TCA**.
- **Input:** 102 original model features.
- **Decision threshold:** 0.44.
- **Backend:** FastAPI.
- **Frontend:** React, TypeScript, Vite, Three.js / React Three Fiber.
- **Visualisation:** 3D Earth and illustrative orbital scenes.

## 1. Problem statement

A conjunction event is a close approach between two space objects. As the orbital environment becomes more congested, operators need ways to review large numbers of conjunction events and identify cases that may deserve closer attention.

This project investigates whether features available in conjunction data messages (CDMs), together with a supervised machine-learning model, can help classify events into higher- and lower-risk groups using observations available before the time of closest approach (TCA).

The goal is **early risk screening and prioritisation**, not autonomous collision prediction or manoeuvre planning.

## 2. How the solution works

The project workflow is:

1. **Inspect the CDM dataset** and understand its structure, event identifiers, missing values, and risk-related fields.
2. **Construct event-level samples** using observations with `time_to_tca >= 2` days.
3. **Select an early observation** for each eligible event.
4. **Create the binary target** from the final event risk value.
5. **Preprocess the original features** using the fitted preprocessing pipeline.
6. **Train and evaluate candidate classifiers**, selecting the XGBoost model using validation performance with emphasis on F2.
7. **Save the fitted pipeline** and serve predictions through FastAPI.
8. **Explore event data and model insights** in the React application.

### Target definition

The notebook's event label is defined as:

- `high_risk = 1` when `final_risk >= -6`
- `high_risk = 0` when `final_risk < -6`

The risk values use a logarithmic scale in the source data. This threshold is the project's chosen classification rule; it should not be interpreted as a universal operational collision-risk threshold.

## 3. Dataset summary

The prepared dataset statistics included in the project report:

| Measure | Value |
|---|---:|
| Raw CDM records inspected | 162,634 |
| Unique conjunction events | 13,154 |
| Unique missions | 19 |
| Early-window cutoff | 2 days before TCA |
| CDM records meeting early cutoff | 111,939 |
| Unique events with eligible early observations | 11,942 |
| High-risk events in early-window event set | 323 |
| Low-risk events in early-window event set | 11,619 |

The prepared event-level CSV and supporting JSON files are stored in `backend/data/`.

**Data note:** The original raw training CSV is not included in this repository. The repository contains the notebook, prepared event data, schema/statistics files, and the trained model artifact. Check the source dataset's licence and redistribution conditions before sharing any additional raw data.

## 4. Machine-learning model

The saved model is `satellite_risk_model_final.pkl`. It contains the fitted pipeline and associated inference metadata. The pipeline expects **102 original input features**.

The custom transformer function required by the saved artifact is in `satellite_transformers.py`. Keep this file alongside the model when loading the artifact.

Preprocessing described in the project workflow includes:
- Median imputation for numerical features.
- Imputation and one-hot encoding for the categorical object-type feature.
- Signed logarithmic transformation for selected covariance determinant features.

**Important:** The saved pipeline performs its own preprocessing. Supply the original feature values; do not apply the preprocessing a second time before inference.

### Held-out test evaluation

The final evaluation values recorded for the selected model are:

| Metric | Test result |
|---|---:|
| Accuracy | 91.63% |
| Precision | 19.73% |
| Recall | 67.69% |
| F1 score | 0.3056 |
| F2 score | 0.4555 |
| ROC-AUC | 0.9118 |
| PR-AUC | 0.3278 |
| Decision threshold | 0.44 |

**Confusion matrix**

| | Predicted low risk | Predicted high risk |
|---|---:|---:|
| Actual low risk | 2,145 | 179 |
| Actual high risk | 21 | 44 |

The test set contains 2,389 samples: 2,324 low-risk and 65 high-risk cases. The model identifies 44 of the 65 high-risk samples (recall 67.69%). Precision is 19.73%, so a substantial proportion of high-risk alerts are false positives under this target definition. Accuracy alone is not sufficient for this imbalanced classification problem.

These are recorded experimental evaluation results, not a guarantee of future performance. `feature_importance.csv` contains the feature-importance values used by the analytics interface. Feature importance describes model behaviour and does not establish causation.

## 5. Application modules

The frontend contains five main sections:

### Mission Overview
A summary of dataset/event statistics, model/API status, and selected conjunction events.

### Orbital Monitor
A 3D Earth and orbital-scene visualisation for exploring conjunction concepts and selected event measurements.

**Visualisation limitation:** The backend explicitly labels the orbital plane RAAN and orbital phase angles as deterministically simulated for display. Other displayed event attributes are drawn from the prepared CDM records. The scene is not live satellite tracking and is not a validated orbit propagation product.

### Conjunction Explorer
A searchable, filterable and sortable view of prepared event-level records, including risk, miss distance, relative speed and time-to-TCA information.

### AI Risk Prediction
A feature-input interface that submits the 102 original model features to the FastAPI `/predict` endpoint and displays the returned class and high-risk probability.

### Analytics & Insights
Displays the recorded model evaluation, confusion matrix, candidate-model validation leaderboard and feature importance.

## 6. Technology stack

| Layer | Technologies |
|---|---|
| Data science | Python, pandas, NumPy, Jupyter |
| Machine learning | XGBoost, scikit-learn |
| Model persistence | joblib |
| Backend | FastAPI, Pydantic, Uvicorn |
| Frontend | React, TypeScript, Vite |
| 3D visualisation | Three.js, React Three Fiber, Drei |
| Charts / animation | Recharts, Framer Motion |
| Styling | Tailwind CSS |

## 7. Repository structure

```text
satellite-risk-prediction/
├── 01_dataset_inspection.ipynb
├── satellite_risk_model_final.pkl
├── satellite_transformers.py
├── feature_importance.csv
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── data/
│       ├── conjunction_events_early.csv
│       ├── dataset_stats.json
│       ├── event_timelines.json
│       └── feature_schema.json
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── index.html
    └── src/
        ├── App.tsx
        ├── components/
        ├── services/
        └── types/
```

Generated dependencies and build output (such as `node_modules/` and `dist/`) are intentionally excluded. They can be recreated using the commands below.

## 8. Run the project locally

### Prerequisites

- Python 3.10 or later, with the backend dependencies installed.
- Node.js and npm.
- Git (optional, for cloning/version control).

### A. Backend setup

Open a terminal in the repository root:

```bash
python -m venv .venv
```

Activate on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Start the API from the repository root:

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The backend expects `satellite_risk_model_final.pkl` and `satellite_transformers.py` in the repository root. Prepared data is loaded from `backend/data/`.

Useful endpoints:

- API root: `http://127.0.0.1:8000/`
- Health check: `http://127.0.0.1:8000/health`
- Interactive API docs: `http://127.0.0.1:8000/docs`

### B. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite (commonly `http://localhost:5173`).

### C. Production build check

From `frontend/`:

```bash
npm run build
```

### Backend endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API information |
| GET | `/health` | Backend/model status |
| POST | `/predict` | Predict risk from 102 input features |
| GET | `/api/overview` | Dataset overview and selected events |
| GET | `/api/events` | Search, filter, sort and paginate events |
| GET | `/api/events/{event_id}` | Retrieve event details and model features |
| GET | `/api/features/schema` | Retrieve feature names, schema and presets |
| GET | `/api/analytics` | Model metrics and feature importance |
| GET | `/api/orbital-scenes` | Data for orbital visualisation scenes |

### Prediction request format

The `/predict` endpoint expects all 102 required original feature names inside a `features` object. The following is a **shortened illustration only**, not a complete valid request:

```json
{
  "features": {
    "time_to_tca": 3.2,
    "mission_id": 1,
    "risk": -12.5,
    "c_object_type": "DEBRIS"
  }
}
```

Use `GET /api/features/schema` to inspect the complete required feature list. The backend returns the predicted class, classification, high-risk probability, threshold and model name.

## 9. Reproducibility and implementation notes

- `01_dataset_inspection.ipynb` documents the data inspection and modelling workflow.
- `satellite_risk_model_final.pkl` is the saved inference artifact.
- `satellite_transformers.py` is required for model deserialization.
- `feature_importance.csv` supports the analytics visualisation.
- `backend/data/` contains the prepared event records and metadata used by the API.
- The application does not need to retrain the model to run.

## 10. Limitations and responsible use

1. This is an academic prototype and has not been certified or validated for operational spaceflight.
2. The binary labels are derived from a selected final-risk threshold, not independently verified collision outcomes.
3. The class distribution is highly imbalanced.
4. The measured precision indicates a meaningful false-positive burden.
5. Prediction quality depends on the quality and timing of input CDM features.
6. The orbital visualisation includes simulated geometry and must not be interpreted as live tracking.
7. Any real collision-avoidance decision requires authoritative tracking data, validated orbit determination and propagation, uncertainty assessment, and qualified operator review.

## 11. Future work

- Evaluate on temporally separated and newer conjunction data.
- Improve precision while maintaining useful recall.
- Add probability calibration and decision-curve analysis.
- Add per-event explanations and uncertainty communication.
- Integrate verified orbital elements and a validated propagation source.
- Add automated backend/frontend tests and model/data version tracking.

---

**ORBITAL INTELLIGENCE**  
*Turning orbital data into earlier risk insights.*

Developed as an academic project combining data science, machine learning, backend API development and 3D visualisation.
