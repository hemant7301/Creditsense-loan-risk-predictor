
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import joblib
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent

ml_model = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Lifespan started")

    ml_model['model'] = joblib.load(BASE_DIR / 'credit_risk_model.pkl')
    ml_model['threshold'] = joblib.load(BASE_DIR / 'best_threshold.pkl')

    print("Loaded keys:", ml_model.keys())

    yield

    ml_model.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)    

class LoanApplication(BaseModel):  # pydantic model (validation)
    person_age: int
    person_income: float
    person_home_ownership: str
    person_emp_length: int
    loan_intent: str
    loan_grade: str
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: int

@app.post("/predict")
def predict(data: LoanApplication):
    df_input = pd.DataFrame([data.model_dump()])
    probability = ml_model['model'].predict_proba(df_input)[:, 1][0]
    prediction = probability >= ml_model['threshold']

    return {
        "default_probability": float(probability),
        "default_prediction": int(prediction),
        "threshold": float(ml_model['threshold']),
        "result": "high risk" if prediction else "low risk"
    }

@app.get("/")
def greet():
    return FileResponse(BASE_DIR / "static" / "index.html")

@app.get("/health")
def health():
    return {"status": "ok"}

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")