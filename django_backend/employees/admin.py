
from django.contrib import admin
from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "employee_code",
        "first_name",
        "last_name",
        "department",
        "designation",
        "status",
    )
    search_fields = (
        "employee_code",
        "first_name",
        "last_name",
        "email",
    )
    list_filter = ("department", "status")
