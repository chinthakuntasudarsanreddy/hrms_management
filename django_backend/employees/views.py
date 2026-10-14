
from rest_framework import generics, permissions
from .models import Employee
from .serializers import EmployeeSerializer


class IsAdminOrHR(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ["ADMIN", "HR"]
        )


class EmployeeListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminOrHR]
    queryset = Employee.objects.select_related("user").all()


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdminOrHR]
    queryset = Employee.objects.select_related("user").all()
