
from rest_framework import serializers

from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "general_enabled",
            "leave_enabled",
            "payroll_enabled",
            "attendance_enabled",
            "system_enabled",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class NotificationBroadcastSerializer(serializers.Serializer):
    TARGET_CHOICES = [
        ("ALL", "Entire organization"),
        ("DEPARTMENT", "Selected department"),
    ]

    title = serializers.CharField(max_length=150, trim_whitespace=True)
    message = serializers.CharField(trim_whitespace=True)
    notification_type = serializers.ChoiceField(
        choices=Notification.NotificationType.choices,
        default=Notification.NotificationType.GENERAL,
    )
    target = serializers.ChoiceField(
        choices=TARGET_CHOICES,
        default="ALL",
    )
    department = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=False,
    )

    def validate(self, attrs):
        if attrs["target"] == "DEPARTMENT" and not attrs.get("department"):
            raise serializers.ValidationError({
                "department": "Department is required for a department broadcast."
            })
        return attrs
