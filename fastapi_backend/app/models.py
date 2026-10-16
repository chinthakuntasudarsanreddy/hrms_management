
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    Date,
    DateTime,
    String,
    UniqueConstraint,
)

from app.database import Base


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "attendance_date",
            name="uq_attendance_employee_date",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, nullable=False, index=True)
    attendance_date = Column(Date, nullable=False)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="PRESENT")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    leave_type = Column(String(30), nullable=False, default="CASUAL")
    reason = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")
    reviewed_by = Column(Integer, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)


class Payroll(Base):
    __tablename__ = "payroll"
    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "pay_month",
            name="uq_payroll_employee_month",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, nullable=False, index=True)
    pay_month = Column(String(7), nullable=False)

    # Salary components
    basic_salary = Column(Integer, nullable=False)
    hra = Column(Integer, nullable=False, default=0)
    other_allowances = Column(Integer, nullable=False, default=0)
    bonus = Column(Integer, nullable=False, default=0)
    overtime_pay = Column(Integer, nullable=False, default=0)

    # Compatibility with existing API and salary slips
    allowances = Column(Integer, nullable=False, default=0)
    deductions = Column(Integer, nullable=False, default=0)

    # Detailed deductions and calculations
    loss_of_pay = Column(Integer, nullable=False, default=0)
    other_deductions = Column(Integer, nullable=False, default=0)
    gross_salary = Column(Integer, nullable=False, default=0)
    overtime_minutes = Column(Integer, nullable=False, default=0)
    loss_of_pay_days = Column(Integer, nullable=False, default=0)

    net_salary = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="PROCESSED")
    created_at = Column(DateTime, nullable=False, default=datetime.now)
