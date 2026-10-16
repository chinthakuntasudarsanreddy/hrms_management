
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Payroll

router = APIRouter(prefix="/salary-slips", tags=["Salary Slips"])


def amount(value):
    return f"Rs. {int(value or 0):,}"


@router.get("/{payroll_id}/pdf")
def download_salary_slip(
    payroll_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payroll = db.query(Payroll).filter_by(id=payroll_id).first()

    if not payroll:
        raise HTTPException(
            status_code=404,
            detail="Payroll record not found",
        )

    employee = db.execute(
        text("""
            SELECT id, user_id, employee_code, first_name, last_name,
                   email, department, designation, date_of_joining
            FROM employees_employee
            WHERE id = :employee_id
        """),
        {"employee_id": payroll.employee_id},
    ).mappings().first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee record not found",
        )

    if user["role"] not in ["ADMIN", "HR"]:
        if (
            user["role"] != "EMPLOYEE"
            or employee["user_id"] != user["user_id"]
        ):
            raise HTTPException(
                status_code=403,
                detail="Access denied",
            )

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "SalarySlipTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#17365D"),
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "SalarySlipSubtitle",
        parent=styles["Normal"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#555555"),
        spaceAfter=12,
    )

    full_name = (
        f"{employee['first_name']} {employee['last_name'] or ''}"
    ).strip()

    story = [
        Paragraph("HRMS — SALARY SLIP", title_style),
        Paragraph(
            f"Salary Month: {payroll.pay_month}",
            subtitle_style,
        ),
    ]

    employee_data = [
        ["Employee Details", "Information"],
        ["Employee Code", str(employee["employee_code"] or "-")],
        ["Employee Name", full_name or "-"],
        ["Email", str(employee["email"] or "-")],
        ["Department", str(employee["department"] or "-")],
        ["Designation", str(employee["designation"] or "-")],
        ["Date of Joining", str(employee["date_of_joining"] or "-")],
    ]

    employee_table = Table(
        employee_data,
        colWidths=[55 * mm, 105 * mm],
        repeatRows=1,
    )

    employee_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17365D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#EAF0F8")),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    story.extend([
        employee_table,
        Spacer(1, 8 * mm),
        Paragraph("Salary Breakdown", styles["Heading2"]),
    ])

    # Use compatibility fallbacks for payroll records created
    # before the advanced payroll fields were introduced.
    basic = payroll.basic_salary or 0
    hra = getattr(payroll, "hra", 0) or 0
    other_allowances = getattr(payroll, "other_allowances", 0) or 0
    bonus = getattr(payroll, "bonus", 0) or 0
    overtime_pay = getattr(payroll, "overtime_pay", 0) or 0
    gross_salary = getattr(payroll, "gross_salary", 0) or 0
    loss_of_pay = getattr(payroll, "loss_of_pay", 0) or 0
    other_deductions = getattr(payroll, "other_deductions", 0) or 0
    overtime_minutes = getattr(payroll, "overtime_minutes", 0) or 0
    loss_of_pay_days = getattr(payroll, "loss_of_pay_days", 0) or 0

    # For older rows, derive a display total from legacy fields.
    if not gross_salary:
        gross_salary = basic + (payroll.allowances or 0)

    salary_data = [
        ["Earnings", "Amount (INR)"],
        ["Basic Salary", amount(basic)],
        ["House Rent Allowance (HRA)", amount(hra)],
        ["Other Allowances", amount(other_allowances)],
        ["Bonus", amount(bonus)],
        [f"Overtime Pay ({overtime_minutes} minutes)", amount(overtime_pay)],
        ["Gross Salary", amount(gross_salary)],
        ["", ""],
        ["Deductions", "Amount (INR)"],
        [f"Loss of Pay ({loss_of_pay_days} days)", amount(loss_of_pay)],
        ["Other Deductions", amount(other_deductions)],
        ["Total Deductions", amount(payroll.deductions)],
        ["NET SALARY", amount(payroll.net_salary)],
    ]

    salary_table = Table(
        salary_data,
        colWidths=[100 * mm, 60 * mm],
        repeatRows=1,
    )

    salary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17365D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, 8), (-1, 8), colors.HexColor("#17365D")),
        ("TEXTCOLOR", (0, 8), (-1, 8), colors.white),
        ("FONTNAME", (0, 8), (-1, 8), "Helvetica-Bold"),
        ("BACKGROUND", (0, 6), (-1, 6), colors.HexColor("#EAF0F8")),
        ("FONTNAME", (0, 6), (-1, 6), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#D9EAD3")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("SPAN", (0, 7), (1, 7)),
    ]))

    story.extend([
        salary_table,
        Spacer(1, 8 * mm),
        Paragraph(
            f"Payroll Status: {payroll.status}",
            styles["Normal"],
        ),
        Spacer(1, 4 * mm),
        Paragraph(
            "This is a computer-generated salary slip.",
            styles["Italic"],
        ),
    ])

    document.build(story)
    buffer.seek(0)

    filename = (
        f"salary_slip_{employee['employee_code']}_{payroll.pay_month}.pdf"
    )

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
