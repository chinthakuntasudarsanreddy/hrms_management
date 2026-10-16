
import calendar
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Attendance, LeaveRequest, Payroll

router = APIRouter(prefix="/payroll", tags=["Payroll"])


def money(value) -> int:
    """Round a salary amount to the nearest whole rupee."""
    return int(
        Decimal(str(value or 0)).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
    )


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
        if (
            user["role"] != "EMPLOYEE"
            or employee["user_id"] != user["user_id"]
        ):
            raise HTTPException(status_code=403, detail="Access denied")

    return employee


def validate_month(pay_month: str):
    try:
        if len(pay_month) != 7:
            raise ValueError
        year, month = map(int, pay_month.split("-"))
        if year < 2000 or not 1 <= month <= 12:
            raise ValueError
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, 1), date(year, month, last_day)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="pay_month must use YYYY-MM format",
        )


def get_attendance_summary(employee_id: int, start_date, end_date, db: Session):
    records = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date,
        )
        .all()
    )

    present_days = sum(
        1 for record in records
        if record.status and record.status.upper() in ("PRESENT", "LATE")
    )

    overtime_minutes = 0
    for record in records:
        if not record.check_in or not record.check_out:
            continue

        # Count overtime only when an active shift assignment exists.
        shift = db.execute(
            text("""
                SELECT s.start_time, s.end_time
                FROM shifts_shiftassignment sa
                JOIN shifts_shift s ON s.id = sa.shift_id
                WHERE sa.employee_id = :employee_id
                  AND sa.start_date <= :work_date
                  AND (sa.end_date IS NULL OR sa.end_date >= :work_date)
                  AND s.is_active = 1
                ORDER BY sa.start_date DESC, sa.id DESC
                LIMIT 1
            """),
            {
                "employee_id": employee_id,
                "work_date": record.attendance_date,
            },
        ).mappings().first()

        if not shift or not shift["start_time"] or not shift["end_time"]:
            continue

        def to_time(value):
            if hasattr(value, "total_seconds"):
                seconds = int(value.total_seconds()) % 86400
                hours, remainder = divmod(seconds, 3600)
                minutes, seconds = divmod(remainder, 60)
                from datetime import time
                return time(hours, minutes, seconds)
            if isinstance(value, str):
                from datetime import time
                return time.fromisoformat(value)
            return value

        from datetime import datetime, timedelta

        start_at = datetime.combine(
            record.attendance_date, to_time(shift["start_time"])
        )
        end_at = datetime.combine(
            record.attendance_date, to_time(shift["end_time"])
        )
        if end_at <= start_at:
            end_at += timedelta(days=1)

        overtime_minutes += max(
            0,
            int((record.check_out - end_at).total_seconds() // 60),
        )

    approved_leave_days = 0
    approved_leaves = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == "APPROVED",
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date,
        )
        .all()
    )

    for leave in approved_leaves:
        overlap_start = max(leave.start_date, start_date)
        overlap_end = min(leave.end_date, end_date)
        approved_leave_days += (overlap_end - overlap_start).days + 1

    return {
        "attendance_records": len(records),
        "present_days": present_days,
        "approved_leave_days": approved_leave_days,
        "overtime_minutes": overtime_minutes,
    }


@router.post("/process/{employee_id}")
def process_payroll(
    employee_id: int,
    pay_month: str = Query(..., description="Salary month in YYYY-MM format"),
    hra: Decimal = Query(Decimal("0"), ge=0),
    other_allowances: Decimal = Query(Decimal("0"), ge=0),
    bonus: Decimal = Query(Decimal("0"), ge=0),
    overtime_rate_per_hour: Decimal = Query(Decimal("0"), ge=0),
    other_deductions: Decimal = Query(Decimal("0"), ge=0),
    loss_of_pay_days: int = Query(0, ge=0),
    working_days: int = Query(26, ge=1, le=31),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] not in ["ADMIN", "HR"]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin or HR can process payroll",
        )

    start_date, end_date = validate_month(pay_month)

    existing = (
        db.query(Payroll)
        .filter_by(employee_id=employee_id, pay_month=pay_month)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Payroll already exists for this employee and month",
        )

    employee = check_employee(employee_id, user, db)
    basic = Decimal(str(employee["base_salary"] or 0))

    if basic < 0:
        raise HTTPException(
            status_code=400,
            detail="Employee base salary cannot be negative",
        )

    attendance = get_attendance_summary(
        employee_id, start_date, end_date, db
    )

    overtime_minutes = attendance["overtime_minutes"]
    overtime_pay_amount = (
        Decimal(overtime_minutes) / Decimal(60)
    ) * overtime_rate_per_hour

    # Approved leave is reported but is not automatically deducted.
    # The HR operator explicitly supplies loss_of_pay_days.
    if loss_of_pay_days > working_days:
        raise HTTPException(
            status_code=400,
            detail="Loss-of-pay days cannot exceed working days",
        )

    daily_basic = basic / Decimal(working_days)
    loss_of_pay_amount = daily_basic * loss_of_pay_days

    hra_amount = Decimal(hra)
    other_allowances_amount = Decimal(other_allowances)
    bonus_amount = Decimal(bonus)
    other_deductions_amount = Decimal(other_deductions)

    gross = (
        basic
        + hra_amount
        + other_allowances_amount
        + bonus_amount
        + overtime_pay_amount
    )

    total_deductions = loss_of_pay_amount + other_deductions_amount
    net = gross - total_deductions

    if net < 0:
        raise HTTPException(
            status_code=400,
            detail="Deductions exceed gross salary; net salary cannot be negative",
        )

    basic_int = money(basic)
    hra_int = money(hra_amount)
    other_allowances_int = money(other_allowances_amount)
    bonus_int = money(bonus_amount)
    overtime_pay_int = money(overtime_pay_amount)
    loss_of_pay_int = money(loss_of_pay_amount)
    other_deductions_int = money(other_deductions_amount)
    gross_int = money(gross)
    deductions_int = loss_of_pay_int + other_deductions_int
    net_int = gross_int - deductions_int

    record = Payroll(
        employee_id=employee_id,
        pay_month=pay_month,
        basic_salary=basic_int,
        hra=hra_int,
        other_allowances=other_allowances_int,
        bonus=bonus_int,
        overtime_pay=overtime_pay_int,
        allowances=hra_int + other_allowances_int + bonus_int + overtime_pay_int,
        deductions=deductions_int,
        loss_of_pay=loss_of_pay_int,
        other_deductions=other_deductions_int,
        gross_salary=gross_int,
        overtime_minutes=overtime_minutes,
        loss_of_pay_days=loss_of_pay_days,
        net_salary=net_int,
        status="PROCESSED",
    )

    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Payroll already exists for this employee and month",
        )

    return {
        "message": "Payroll processed successfully",
        "payroll_id": record.id,
        "employee_id": record.employee_id,
        "pay_month": record.pay_month,
        "attendance_summary": attendance,
        "salary": {
            "basic_salary": record.basic_salary,
            "hra": record.hra,
            "other_allowances": record.other_allowances,
            "bonus": record.bonus,
            "overtime_minutes": record.overtime_minutes,
            "overtime_pay": record.overtime_pay,
            "gross_salary": record.gross_salary,
            "loss_of_pay_days": record.loss_of_pay_days,
            "loss_of_pay": record.loss_of_pay,
            "other_deductions": record.other_deductions,
            "total_deductions": record.deductions,
            "net_salary": record.net_salary,
        },
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
            "id": record.id,
            "employee_id": record.employee_id,
            "pay_month": record.pay_month,
            "basic_salary": record.basic_salary,
            "hra": record.hra,
            "other_allowances": record.other_allowances,
            "bonus": record.bonus,
            "overtime_minutes": record.overtime_minutes,
            "overtime_pay": record.overtime_pay,
            "allowances": record.allowances,
            "gross_salary": record.gross_salary,
            "loss_of_pay_days": record.loss_of_pay_days,
            "loss_of_pay": record.loss_of_pay,
            "other_deductions": record.other_deductions,
            "deductions": record.deductions,
            "net_salary": record.net_salary,
            "status": record.status,
        }
        for record in records
    ]
