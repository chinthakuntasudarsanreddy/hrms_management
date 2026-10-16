from django.db import models


class Shift(models.Model):
    GENERAL = "GENERAL"
    MORNING = "MORNING"
    NIGHT = "NIGHT"
    FLEXIBLE = "FLEXIBLE"
    REMOTE = "REMOTE"

    SHIFT_TYPES = [
        (GENERAL, "General"),
        (MORNING, "Morning"),
        (NIGHT, "Night"),
        (FLEXIBLE, "Flexible"),
        (REMOTE, "Remote"),
    ]

    name = models.CharField(max_length=100, unique=True)
    shift_type = models.CharField(
        max_length=20,
        choices=SHIFT_TYPES,
        default=GENERAL,
    )
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    break_minutes = models.PositiveIntegerField(default=60)
    grace_minutes = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ShiftAssignment(models.Model):
    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.PROTECT,
        related_name="shift_assignments",
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.PROTECT,
        related_name="assignments",
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-start_date", "-assigned_at"]

    def __str__(self):
        return f"{self.employee} - {self.shift} ({self.start_date})"