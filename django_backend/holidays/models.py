
from django.conf import settings
from django.db import models


class Holiday(models.Model):
    class HolidayType(models.TextChoices):
        COMPANY = "COMPANY", "Company-wide"
        DEPARTMENT = "DEPARTMENT", "Department-specific"
        REGIONAL = "REGIONAL", "Regional"
        OPTIONAL = "OPTIONAL", "Optional"

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    holiday_type = models.CharField(
        max_length=20,
        choices=HolidayType.choices,
        default=HolidayType.COMPANY,
    )
    department = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_date", "name"]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.end_date < self.start_date:
            raise ValidationError(
                {"end_date": "End date cannot be before start date."}
            )

        if (
            self.holiday_type == self.HolidayType.DEPARTMENT
            and not self.department.strip()
        ):
            raise ValidationError(
                {"department": "Department is required for this holiday."}
            )

        if (
            self.holiday_type == self.HolidayType.REGIONAL
            and not self.region.strip()
        ):
            raise ValidationError(
                {"region": "Region is required for this holiday."}
            )

    def __str__(self):
        return f"{self.name} ({self.start_date})"


class HolidaySelection(models.Model):
    """An employee's selection of an optional holiday."""

    holiday = models.ForeignKey(
        Holiday,
        on_delete=models.CASCADE,
        related_name="selections",
    )
    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="holiday_selections",
    )
    selected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["holiday", "employee"],
                name="unique_employee_holiday_selection",
            )
        ]

    def __str__(self):
        return f"{self.employee.employee_code} - {self.holiday.name}"
