from rest_framework import serializers
from .models import Shift, ShiftAssignment


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(
        source="employee.employee_code",
        read_only=True,
    )
    shift_name = serializers.CharField(
        source="shift.name",
        read_only=True,
    )

    class Meta:
        model = ShiftAssignment
        fields = [
            "id",
            "employee",
            "employee_code",
            "shift",
            "shift_name",
            "start_date",
            "end_date",
            "assigned_at",
            "notes",
        ]
        read_only_fields = ("assigned_at",)

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None),
        )
        end_date = attrs.get(
            "end_date",
            getattr(self.instance, "end_date", None),
        )

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({
                "end_date": "End date cannot be before start date."
            })

        return attrs