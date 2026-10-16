
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Employee
from .serializers import EmployeeSerializer


class IsHRorAdmin(IsAuthenticated):
    """
    Allow authenticated staff, superusers, or users
    whose role is HR or ADMIN.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        user = request.user
        role = str(getattr(user, "role", "")).upper()

        return (
            user.is_superuser
            or user.is_staff
            or role in {"ADMIN", "HR"}
        )


class EmployeeListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [IsHRorAdmin]

    def get_queryset(self):
        queryset = Employee.objects.select_related("user").all()

        search = self.request.query_params.get("search", "").strip()
        employee_status = self.request.query_params.get("status", "").strip()

        if search:
            queryset = queryset.filter(
                Q(employee_code__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(department__icontains=search)
                | Q(designation__icontains=search)
            )

        if employee_status:
            queryset = queryset.filter(status=employee_status.upper())

        return queryset.order_by("employee_code")


class EmployeeDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [IsHRorAdmin]
    queryset = Employee.objects.select_related("user").all()
    http_method_names = ["get", "patch", "head", "options"]


class EmployeeDeactivateView(APIView):
    permission_classes = [IsHRorAdmin]

    def patch(self, request, pk):
        try:
            employee = Employee.objects.get(pk=pk)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if employee.status == Employee.Status.INACTIVE:
            return Response(
                {"detail": "Employee is already inactive."},
                status=status.HTTP_200_OK,
            )

        employee.status = Employee.Status.INACTIVE
        employee.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "message": "Employee deactivated successfully.",
                "employee_id": employee.id,
                "status": employee.status,
            },
            status=status.HTTP_200_OK,
        )
