from django.contrib import admin
from .models import Shift, ShiftAssignment


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "shift_type",
        "start_time",
        "end_time",
        "is_active",
    )
    list_filter = ("shift_type", "is_active")
    search_fields = ("name",)


@admin.register(ShiftAssignment)
class ShiftAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "employee",
        "shift",
        "start_date",
        "end_date",
        "assigned_at",
    )
    list_filter = ("shift", "start_date")
    search_fields = ("employee__employee_code", "shift__name")