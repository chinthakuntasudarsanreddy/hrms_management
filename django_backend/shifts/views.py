from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import Shift, ShiftAssignment
from .serializers import ShiftSerializer, ShiftAssignmentSerializer


class HRMSWritePermission:
    """Allow only administrators and HR staff to modify schedules."""

    def check_write_permission(self, request):
        role = getattr(request.user, "role", "")
        if role not in ("ADMIN", "HR"):
            raise PermissionDenied(
                "Only administrators and HR staff can modify shifts."
            )


class ShiftViewSet(HRMSWritePermission, viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Shift.objects.all()
        if self.request.query_params.get("active") == "true":
            queryset = queryset.filter(is_active=True)
        return queryset

    def perform_create(self, serializer):
        self.check_write_permission(self.request)
        serializer.save()

    def perform_update(self, serializer):
        self.check_write_permission(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        self.check_write_permission(self.request)
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class ShiftAssignmentViewSet(
    HRMSWritePermission,
    viewsets.ModelViewSet,
):
    queryset = ShiftAssignment.objects.select_related(
        "employee", "shift"
    ).all()
    serializer_class = ShiftAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        employee_id = self.request.query_params.get("employee_id")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        return queryset

    def perform_create(self, serializer):
        self.check_write_permission(self.request)
        serializer.save()

    def perform_update(self, serializer):
        self.check_write_permission(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        self.check_write_permission(self.request)
        instance.end_date = instance.end_date or __import__(
            "datetime"
        ).date.today()
        instance.save(update_fields=["end_date"])