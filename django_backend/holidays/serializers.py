
from rest_framework import serializers
from .models import Holiday


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = [
            "id",
            "name",
            "description",
            "start_date",
            "end_date",
            "holiday_type",
            "department",
            "region",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None),
        )
        end_date = attrs.get(
            "end_date",
            getattr(self.instance, "end_date", None),
        )

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                "end_date": "End date cannot be before start date."
            })

        holiday_type = attrs.get(
            "holiday_type",
            getattr(self.instance, "holiday_type", "COMPANY"),
        )
        department = attrs.get(
            "department",
            getattr(self.instance, "department", ""),
        )
        region = attrs.get(
            "region",
            getattr(self.instance, "region", ""),
        )

        if holiday_type == "DEPARTMENT" and not department.strip():
            raise serializers.ValidationError({
                "department": "Department is required."
            })

        if holiday_type == "REGIONAL" and not region.strip():
            raise serializers.ValidationError({
                "region": "Region is required."
            })

        return attrs
