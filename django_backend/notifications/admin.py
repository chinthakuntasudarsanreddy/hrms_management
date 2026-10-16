
from django.contrib import admin

from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "recipient",
        "notification_type",
        "is_read",
        "created_at",
    )
    list_filter = ("notification_type", "is_read", "created_at")
    search_fields = ("title", "message", "recipient__username", "recipient__email")
    readonly_fields = ("created_at",)
    list_select_related = ("recipient",)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "general_enabled",
        "leave_enabled",
        "payroll_enabled",
        "attendance_enabled",
        "system_enabled",
        "updated_at",
    )
    search_fields = ("user__username", "user__email")
