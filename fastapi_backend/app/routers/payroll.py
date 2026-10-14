
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import calendar

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Payroll

router = APIRouter(prefix="/payroll", tags=["Payroll"])


def check_employee(employee_id: int, user: dict, db: Session):
    employee = db.execute(
        text("""
            SELECT id, user_id, base_salary
            FROM employees_employee
            WHERE id = :employee_id
        """),
        {"employee_id": employee_id},
    ).mappings().first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if user["role"] not in ["ADMIN", "HR"]:
        if user["role"] != "EMPLOYEE" or employee["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

    return employee


@router.post("/process/{employee_id}")
def process_payroll(
    employee_id: int,
    pay_month: str,
    allowances: Decimal = Decimal("0"),
    deductions: Decimal = Decimal("0"),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] not in ["ADMIN", "HR"]:
        raise HTTPException(status_code=403, detail="Only Admin or HR can process payroll")

    try:
        year, month = map(int, pay_month.split("-"))
        if len(pay_month) != 7 or not 1 <= month <= 12 or year < 2000:
            raise ValueError
        calendar.monthrange(year, month)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="pay_month must use YYYY-MM format")

    if allowances < 0 or deductions < 0:
        raise HTTPException(status_code=400, detail="Allowances and deductions cannot be negative")

    employee = check_employee(employee_id, user, db)

    existing = db.query(Payroll).filter_by(
        employee_id=employee_id, pay_month=pay_month
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Payroll already exists for this employee and month")

    basic = Decimal(str(employee["base_salary"] or 0))
    net = (basic + allowances - deductions).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if net < 0:
        raise HTTPException(status_code=400, detail="Net salary cannot be negative")

    record = Payroll(
        employee_id=employee_id,
        pay_month=pay_month,
        basic_salary=int(basic),
        allowances=int(allowances),
        deductions=int(deductions),
        net_salary=int(net),
        status="PROCESSED",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Payroll processed",
        "payroll_id": record.id,
        "employee_id": record.employee_id,
        "pay_month": record.pay_month,
        "basic_salary": record.basic_salary,
        "allowances": record.allowances,
        "deductions": record.deductions,
        "net_salary": record.net_salary,
        "status": record.status,
    }


@router.get("/employee/{employee_id}")
def get_employee_payroll(
    employee_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_employee(employee_id, user, db)

    records = (
        db.query(Payroll)
        .filter_by(employee_id=employee_id)
        .order_by(Payroll.pay_month.desc())
        .all()
    )

    return [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "pay_month": r.pay_month,
            "basic_salary": r.basic_salary,
            "allowances": r.allowances,
            "deductions": r.deductions,
            "net_salary": r.net_salary,
            "status": r.status,
        }
        for r in records
    ]

