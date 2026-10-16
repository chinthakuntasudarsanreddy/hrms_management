
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import LeaveRequest

router = APIRouter(prefix="/leave", tags=["Leave Management"])


def check_employee(employee_id: int, user: dict, db: Session):
    employee = db.execute(
        text("""
            SELECT id, user_id, employee_code, first_name, last_name
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


def serialize_leave(request, employee=None):
    employee_name = None
    employee_code = None

    if employee:
        employee_name = (
            f'{employee["first_name"]} {employee["last_name"]}'.strip()
        )
        employee_code = employee["employee_code"]

    return {
        "id": request.id,
        "employee_id": request.employee_id,
        "employee_code": employee_code,
        "employee_name": employee_name,
        "start_date": str(request.start_date),
        "end_date": str(request.end_date),
        "leave_type": request.leave_type,
        "reason": request.reason,
        "status": request.status,
        "created_at": (
            request.created_at.isoformat()
            if getattr(request, "created_at", None)
            else None
        ),
    }


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

    leave_type = leave_type.strip().upper()
    allowed_types = {"CASUAL", "SICK", "EARNED"}

    if leave_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Leave type must be CASUAL, SICK, or EARNED",
        )

    if not reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Leave reason is required",
        )

    request = LeaveRequest(
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        leave_type=leave_type,
        reason=reason.strip(),
        status="PENDING",
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return {
        "message": "Leave request submitted successfully",
        "leave": serialize_leave(request),
    }


@router.get("/pending")
def get_pending_leaves(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] not in ["ADMIN", "HR"]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin or HR can view pending leave requests",
        )

    requests = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.status == "PENDING")
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )

    results = []

    for request in requests:
        employee = db.execute(
            text("""
                SELECT id, employee_code, first_name, last_name
                FROM employees_employee
                WHERE id = :employee_id
            """),
            {"employee_id": request.employee_id},
        ).mappings().first()

        results.append(serialize_leave(request, employee))

    return results


@router.get("/summary")
def leave_summary(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] not in ["ADMIN", "HR"]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin or HR can view leave summary",
        )

    total = db.query(LeaveRequest).count()
    pending = db.query(LeaveRequest).filter_by(status="PENDING").count()
    approved = db.query(LeaveRequest).filter_by(status="APPROVED").count()
    rejected = db.query(LeaveRequest).filter_by(status="REJECTED").count()

    return {
        "total_requests": total,
        "pending_requests": pending,
        "approved_requests": approved,
        "rejected_requests": rejected,
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

    return [serialize_leave(request) for request in requests]


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

    decision = decision.strip().upper()

    if decision not in {"APPROVED", "REJECTED"}:
        raise HTTPException(
            status_code=400,
            detail="Decision must be APPROVED or REJECTED",
        )

    request = (
        db.query(LeaveRequest)
        .filter_by(id=leave_id)
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Leave request not found",
        )

    if request.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="This leave request has already been reviewed",
        )

    request.status = decision
    request.reviewed_by = user["user_id"]
    request.reviewed_at = datetime.now()

    db.commit()
    db.refresh(request)

    return {
        "message": f"Leave request {decision.lower()} successfully",
        "leave_id": request.id,
        "status": request.status,
    }
