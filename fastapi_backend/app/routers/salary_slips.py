
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


@router.get("/{payroll_id}/pdf")
def download_salary_slip(
    payroll_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payroll = db.query(Payroll).filter_by(id=payroll_id).first()

    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")

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
        raise HTTPException(status_code=404, detail="Employee record not found")

    if user["role"] not in ["ADMIN", "HR"]:
        if (
            user["role"] != "EMPLOYEE"
            or employee["user_id"] != user["user_id"]
        ):
            raise HTTPException(status_code=403, detail="Access denied")

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "SalarySlipTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#17365D"),
        spaceAfter=8,
    )

    story = [
        Paragraph("HRMS - SALARY SLIP", title_style),
        Paragraph(f"Salary Month: {payroll.pay_month}", styles["Heading2"]),
        Spacer(1, 8 * mm),
    ]

    full_name = (
        f"{employee['first_name']} {employee['last_name'] or ''}"
    ).strip()

    employee_data = [
        ["Employee Code", employee["employee_code"]],
        ["Employee Name", full_name],
        ["Email", employee["email"]],
        ["Department", employee["department"]],
        ["Designation", employee["designation"]],
        ["Date of Joining", str(employee["date_of_joining"])],
    ]

    employee_table = Table(employee_data, colWidths=[55 * mm, 105 * mm])
    employee_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF0F8")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#17365D")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    story.extend([
        employee_table,
        Spacer(1, 10 * mm),
        Paragraph("Salary Details", styles["Heading2"]),
    ])

    salary_data = [
        ["Description", "Amount (INR)"],
        ["Basic Salary", f"Rs. {payroll.basic_salary:,.2f}"],
        ["Allowances", f"Rs. {payroll.allowances:,.2f}"],
        ["Deductions", f"Rs. {payroll.deductions:,.2f}"],
        ["Net Salary", f"Rs. {payroll.net_salary:,.2f}"],
    ]

    salary_table = Table(salary_data, colWidths=[100 * mm, 60 * mm])
    salary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17365D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#E2F0D9")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("PADDING", (0, 0), (-1, -1), 9),
    ]))

    story.extend([
        salary_table,
        Spacer(1, 12 * mm),
        Paragraph(
            f"Payroll Status: {payroll.status}",
            styles["Normal"],
        ),
        Spacer(1, 5 * mm),
        Paragraph(
            "This is a computer-generated salary slip.",
            styles["Italic"],
        ),
    ])

    document.build(story)
    buffer.seek(0)

    filename = f"salary_slip_{employee['employee_code']}_{payroll.pay_month}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
