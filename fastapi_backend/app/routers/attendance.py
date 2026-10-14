
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.auth import get_current_user
from app.database import get_db
from app.models import Attendance

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def get_employee_for_user(user, db: Session):
    """Find the employee profile linked to the logged-in user."""
    employee = db.execute(
        text("""
            SELECT id, user_id
            FROM employees_employee
            WHERE user_id = :user_id
        """),
        {"user_id": user["user_id"]},
    ).mappings().first()

    if not employee:
        raise HTTPException(
            status_code=400,
            detail="No employee profile is linked to your account",
        )

    return employee


def resolve_employee_id(employee_id, user, db: Session):
    """Resolve employee ID automatically for employees."""
    role = user["role"]

    if role == "EMPLOYEE":
        employee = get_employee_for_user(user, db)

        if employee_id is not None and employee_id != employee["id"]:
            raise HTTPException(
                status_code=403,
                detail="You cannot access another employee's attendance",
            )

        return employee["id"]

    if role in ["ADMIN", "HR"]:
        if employee_id is None:
            raise HTTPException(
                status_code=422,
                detail="employee_id is required for HR/Admin",
            )
        return authorize_employee(employee_id, user, db)["id"]

    raise HTTPException(status_code=403, detail="Access denied")


def authorize_employee(employee_id, user, db: Session):
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


@router.post("/clock-in")
def clock_in(
    employee_id: int | None = Query(default=None, gt=0),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee_id = resolve_employee_id(employee_id, user, db)

    today = date.today()
    now = datetime.now()

    record = db.query(Attendance).filter_by(
        employee_id=employee_id,
        attendance_date=today,
    ).first()

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
        "attendance_id": record.id,
        "employee_id": record.employee_id,
        "attendance_date": str(record.attendance_date),
        "check_in": str(record.check_in),
        "status": record.status,
    }


@router.post("/clock-out")
def clock_out(
    employee_id: int | None = Query(default=None, gt=0),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee_id = resolve_employee_id(employee_id, user, db)

    record = db.query(Attendance).filter_by(
        employee_id=employee_id,
        attendance_date=date.today(),
    ).first()

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
        "attendance_id": record.id,
        "employee_id": record.employee_id,
        "check_in": str(record.check_in),
        "check_out": str(record.check_out),
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

    return [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "attendance_date": str(r.attendance_date),
            "check_in": str(r.check_in) if r.check_in else None,
            "check_out": str(r.check_out) if r.check_out else None,
            "status": r.status,
        }
        for r in records
    ]


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

    return [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "attendance_date": str(r.attendance_date),
            "check_in": str(r.check_in) if r.check_in else None,
            "check_out": str(r.check_out) if r.check_out else None,
            "status": r.status,
        }
        for r in records
    ]
