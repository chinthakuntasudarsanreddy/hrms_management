
from django.contrib import admin
from .models import Holiday, HolidaySelection


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "start_date",
        "end_date",
        "holiday_type",
        "department",
        "region",
        "is_active",
    )
    list_filter = ("holiday_type", "is_active", "start_date")
    search_fields = ("name", "department", "region")
    date_hierarchy = "start_date"


@admin.register(HolidaySelection)
class HolidaySelectionAdmin(admin.ModelAdmin):
    list_display = ("employee", "holiday", "selected_at")
    list_filter = ("holiday",)
    search_fields = (
        "employee__employee_code",
        "employee__first_name",
        "holiday__name",
    )
