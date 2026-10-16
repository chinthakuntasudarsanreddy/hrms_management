
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Attendance

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def get_employee_for_user(user, db: Session):
    employee = db.execute(
        text("""
            SELECT id, user_id, employee_code, first_name,
                   last_name, email
            FROM employees_employee
            WHERE user_id = :user_id
        """),
        {"user_id": user["user_id"]},
    ).mappings().first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="No employee profile is linked to your account",
        )

    return employee


def authorize_employee(employee_id: int, user, db: Session):
    employee = db.execute(
        text("""
            SELECT id, user_id
            FROM employees_employee
            WHERE id = :employee_id
        """),
        {"employee_id": employee_id},
    ).mappings().first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if user["role"] == "EMPLOYEE":
        if employee["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user["role"] not in ["ADMIN", "HR"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return employee


def resolve_employee_id(employee_id, user, db: Session):
    if user["role"] == "EMPLOYEE":
        employee = get_employee_for_user(user, db)

        if employee_id is not None and employee_id != employee["id"]:
            raise HTTPException(
                status_code=403,
                detail="You cannot access another employee's attendance",
            )

        return employee["id"]

    if user["role"] in ["ADMIN", "HR"]:
        if employee_id is None:
            raise HTTPException(
                status_code=422,
                detail="employee_id is required for HR/Admin",
            )

        return authorize_employee(employee_id, user, db)["id"]

    raise HTTPException(status_code=403, detail="Access denied")


def get_assigned_shift(employee_id: int, db: Session, work_date=None):
    """
    Find the active shift assignment for an employee on a given date.
    Uses the Django tables shared with this FastAPI application.
    """
    work_date = work_date or date.today()

    result = db.execute(
        text("""
            SELECT
                s.id AS shift_id,
                s.name AS shift_name,
                s.shift_type AS shift_type,
                s.start_time AS start_time,
                s.end_time AS end_time,
                s.break_minutes AS break_minutes,
                s.grace_minutes AS grace_minutes,
                sa.start_date AS assignment_start_date,
                sa.end_date AS assignment_end_date
            FROM shifts_shiftassignment sa
            JOIN shifts_shift s ON s.id = sa.shift_id
            WHERE sa.employee_id = :employee_id
              AND sa.start_date <= :work_date
              AND (sa.end_date IS NULL OR sa.end_date >= :work_date)
              AND s.is_active = 1
            ORDER BY sa.start_date DESC, sa.id DESC
            LIMIT 1
        """),
        {"employee_id": employee_id, "work_date": work_date},
    ).mappings().first()

    return result


def as_time(value):
    """Convert a database time value to datetime.time."""
    if value is None:
        return None

    if isinstance(value, time):
        return value

    if isinstance(value, timedelta):
        seconds = int(value.total_seconds()) % (24 * 60 * 60)
        hours, remainder = divmod(seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        return time(hours, minutes, seconds)

    return time.fromisoformat(str(value))


def scheduled_times(shift, work_date):
    """
    Build scheduled datetimes, including shifts that end the next day.
    """
    if not shift or not shift["start_time"] or not shift["end_time"]:
        return None, None

    start_time = as_time(shift["start_time"])
    end_time = as_time(shift["end_time"])

    start_at = datetime.combine(work_date, start_time)
    end_at = datetime.combine(work_date, end_time)

    if end_at <= start_at:
        end_at += timedelta(days=1)

    return start_at, end_at


def calculate_metrics(record, shift):
    """
    Calculate attendance metrics without requiring new database columns.
    """
    work_date = record.attendance_date
    start_at, end_at = scheduled_times(shift, work_date)

    result = {
        "shift_id": shift["shift_id"] if shift else None,
        "shift_name": shift["shift_name"] if shift else None,
        "shift_type": shift["shift_type"] if shift else None,
        "scheduled_start": str(start_at) if start_at else None,
        "scheduled_end": str(end_at) if end_at else None,
        "grace_minutes": int(shift["grace_minutes"] or 0) if shift else None,
        "late_arrival": None,
        "late_minutes": None,
        "early_departure": None,
        "early_departure_minutes": None,
        "overtime_minutes": None,
        "worked_minutes": None,
    }

    if record.check_in and record.check_out:
        worked_minutes = max(
            0,
            int((record.check_out - record.check_in).total_seconds() // 60),
        )
        result["worked_minutes"] = worked_minutes

    if not start_at or not end_at:
        return result

    if record.check_in:
        grace_minutes = int(shift["grace_minutes"] or 0)
        allowed_start = start_at + timedelta(minutes=grace_minutes)
        late_minutes = max(
            0,
            int((record.check_in - allowed_start).total_seconds() // 60),
        )
        result["late_arrival"] = late_minutes > 0
        result["late_minutes"] = late_minutes

    if record.check_out:
        early_minutes = max(
            0,
            int((end_at - record.check_out).total_seconds() // 60),
        )
        overtime_minutes = max(
            0,
            int((record.check_out - end_at).total_seconds() // 60),
        )

        result["early_departure"] = early_minutes > 0
        result["early_departure_minutes"] = early_minutes
        result["overtime_minutes"] = overtime_minutes

    return result


def serialize_attendance(record, db: Session):
    shift = get_assigned_shift(
        record.employee_id,
        db,
        record.attendance_date,
    )

    return {
        "id": record.id,
        "employee_id": record.employee_id,
        "attendance_date": str(record.attendance_date),
        "check_in": str(record.check_in) if record.check_in else None,
        "check_out": str(record.check_out) if record.check_out else None,
        "status": record.status,
        **calculate_metrics(record, shift),
    }


@router.get("/profile")
def my_employee_profile(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = get_employee_for_user(user, db)

    return {
        "employee_id": employee["id"],
        "employee_code": employee["employee_code"],
        "first_name": employee["first_name"],
        "last_name": employee["last_name"],
        "email": employee["email"],
    }


@router.get("/me")
def my_attendance(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = get_employee_for_user(user, db)

    records = (
        db.query(Attendance)
        .filter_by(employee_id=employee["id"])
        .order_by(Attendance.attendance_date.desc())
        .all()
    )

    return [serialize_attendance(record, db) for record in records]


@router.post("/clock-in")
def clock_in(
    employee_id: int | None = Query(default=None, gt=0),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee_id = resolve_employee_id(employee_id, user, db)
    today = date.today()
    now = datetime.now()

    record = (
        db.query(Attendance)
        .filter_by(employee_id=employee_id, attendance_date=today)
        .first()
    )

    if record and record.check_in:
        raise HTTPException(
            status_code=400,
            detail="Already clocked in today",
        )

    if record:
        record.check_in = now
        record.status = "PRESENT"
    else:
        record = Attendance(
            employee_id=employee_id,
            attendance_date=today,
            check_in=now,
            status="PRESENT",
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return {
        "message": "Clock-in recorded successfully",
        **serialize_attendance(record, db),
    }


@router.post("/clock-out")
def clock_out(
    employee_id: int | None = Query(default=None, gt=0),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee_id = resolve_employee_id(employee_id, user, db)
    today = date.today()

    record = (
        db.query(Attendance)
        .filter_by(employee_id=employee_id, attendance_date=today)
        .first()
    )

    if not record or not record.check_in:
        raise HTTPException(
            status_code=400,
            detail="Clock in before clocking out",
        )

    if record.check_out:
        raise HTTPException(
            status_code=400,
            detail="Already clocked out today",
        )

    record.check_out = datetime.now()
    db.commit()
    db.refresh(record)

    return {
        "message": "Clock-out recorded successfully",
        **serialize_attendance(record, db),
    }


@router.get("/employee/{employee_id}")
def employee_attendance(
    employee_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    authorize_employee(employee_id, user, db)

    records = (
        db.query(Attendance)
        .filter_by(employee_id=employee_id)
        .order_by(Attendance.attendance_date.desc())
        .all()
    )

    return [serialize_attendance(record, db) for record in records]
