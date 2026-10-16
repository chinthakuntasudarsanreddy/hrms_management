
from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        GENERAL = "GENERAL", "General"
        LEAVE = "LEAVE", "Leave"
        PAYROLL = "PAYROLL", "Payroll"
        ATTENDANCE = "ATTENDANCE", "Attendance"
        SYSTEM = "SYSTEM", "System"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=150)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL,
        db_index=True,
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "is_read", "-created_at"],
                name="notif_rec_read_date_idx",
            ),
        ]

    def __str__(self):
        return f"{self.title} - {self.recipient}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    general_enabled = models.BooleanField(default=True)
    leave_enabled = models.BooleanField(default=True)
    payroll_enabled = models.BooleanField(default=True)
    attendance_enabled = models.BooleanField(default=True)
    system_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Notification preferences - {self.user}"
