
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models

from app.routers.attendance import router as attendance_router
from app.routers.leave import router as leave_router
from app.routers.payroll import router as payroll_router
from app.routers.salary_slips import router as salary_slips_router
from app.routers.dashboard import router as dashboard_router

app = FastAPI(
    title="HRMS Operations API",
    description="Attendance, leave, payroll and salary slips",
    version="1.0.0",
)

# Allow requests from the React/Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


app.include_router(attendance_router)
app.include_router(leave_router)
app.include_router(payroll_router)
app.include_router(salary_slips_router)
app.include_router(dashboard_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "HRMS Operations API",
    }
