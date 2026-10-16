
# employees/serializers.py

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Employee

User = get_user_model()


class EmployeeSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Employee
        fields = [
            "id",
            "user_id",
            "employee_code",
            "first_name",
            "last_name",
            "email",
            "phone",
            "department",
            "designation",
            "date_of_joining",
            "base_salary",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_email(self, value):
        return value.strip().lower()

    def validate_employee_code(self, value):
        return value.strip().upper()

    def validate_base_salary(self, value):
        if value < 0:
            raise serializers.ValidationError(
                "Base salary cannot be negative."
            )
        return value
