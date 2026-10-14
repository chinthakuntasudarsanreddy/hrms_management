
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.auth import get_current_user
from app.database import get_db
from app.models import LeaveRequest

router = APIRouter(prefix="/leave", tags=["Leave Management"])


def check_employee(employee_id: int, user: dict, db: Session):
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

    if user["role"] not in ["ADMIN", "HR"]:
        if (
            user["role"] != "EMPLOYEE"
            or employee["user_id"] != user["user_id"]
        ):
            raise HTTPException(status_code=403, detail="Access denied")

    return employee


@router.post("/apply")
def apply_leave(
    employee_id: int,
    start_date: date,
    end_date: date,
    leave_type: str,
    reason: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_employee(employee_id, user, db)

    if end_date < start_date:
        raise HTTPException(
            status_code=400,
            detail="End date cannot be before start date",
        )

    allowed_types = {"CASUAL", "SICK", "EARNED"}
    if leave_type.upper() not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Leave type must be CASUAL, SICK, or EARNED",
        )

    request = LeaveRequest(
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        leave_type=leave_type.upper(),
        reason=reason,
        status="PENDING",
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return {
        "message": "Leave request submitted",
        "id": request.id,
        "employee_id": request.employee_id,
        "start_date": str(request.start_date),
        "end_date": str(request.end_date),
        "leave_type": request.leave_type,
        "status": request.status,
    }


@router.get("/employee/{employee_id}")
def get_employee_leaves(
    employee_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_employee(employee_id, user, db)

    requests = (
        db.query(LeaveRequest)
        .filter_by(employee_id=employee_id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )

    return [
        {
            "id": r.id,
            "employee_id": r.employee_id,
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "leave_type": r.leave_type,
            "reason": r.reason,
            "status": r.status,
        }
        for r in requests
    ]


@router.patch("/{leave_id}/review")
def review_leave(
    leave_id: int,
    decision: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] not in ["ADMIN", "HR"]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin or HR can review leave requests",
        )

    decision = decision.upper()
    if decision not in {"APPROVED", "REJECTED"}:
        raise HTTPException(
            status_code=400,
            detail="Decision must be APPROVED or REJECTED",
        )

    request = db.query(LeaveRequest).filter_by(id=leave_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if request.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="This leave request has already been reviewed",
        )

    request.status = decision
    request.reviewed_by = user["user_id"]
    request.reviewed_at = datetime.now()

    db.commit()

    return {
        "message": f"Leave request {decision.lower()}",
        "leave_id": request.id,
        "status": request.status,
    }
