
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def dashboard_summary(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] not in ["ADMIN", "HR"]:
        raise HTTPException(
            status_code=403,
            detail="Dashboard summary is available to Admin or HR",
        )

    today = date.today()

    employee_count = db.execute(
        text("SELECT COUNT(*) FROM employees_employee")
    ).scalar_one()

    active_employees = db.execute(
        text("""
            SELECT COUNT(*)
            FROM employees_employee
            WHERE status = 'ACTIVE'
        """)
    ).scalar_one()

    attendance_today = db.execute(
        text("""
            SELECT COUNT(*)
            FROM attendance
            WHERE attendance_date = :today
        """),
        {"today": today},
    ).scalar_one()

    present_today = db.execute(
        text("""
            SELECT COUNT(*)
            FROM attendance
            WHERE attendance_date = :today
              AND status = 'PRESENT'
        """),
        {"today": today},
    ).scalar_one()

    pending_leaves = db.execute(
        text("""
            SELECT COUNT(*)
            FROM leave_requests
            WHERE status = 'PENDING'
        """)
    ).scalar_one()

    current_month = today.strftime("%Y-%m")

    payroll_totals = db.execute(
        text("""
            SELECT COUNT(*) AS payroll_count,
                   COALESCE(SUM(net_salary), 0) AS total_net_salary
            FROM payroll
            WHERE pay_month = :pay_month
        """),
        {"pay_month": current_month},
    ).mappings().one()

    return {
        "date": str(today),
        "total_employees": employee_count,
        "active_employees": active_employees,
        "attendance_records_today": attendance_today,
        "present_today": present_today,
        "pending_leave_requests": pending_leaves,
        "payroll_month": current_month,
        "payroll_records_this_month": payroll_totals["payroll_count"],
        "total_net_payroll_this_month": float(
            payroll_totals["total_net_salary"]
        ),
    }
