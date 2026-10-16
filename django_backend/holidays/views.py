
from datetime import date

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Holiday, HolidaySelection
from .serializers import HolidaySerializer


def is_hr_or_admin(user):
    return user.is_authenticated and user.role in ("ADMIN", "HR")


class HolidayViewSet(viewsets.ModelViewSet):
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Holiday.objects.filter(is_active=True)

        if is_hr_or_admin(user):
            queryset = Holiday.objects.all()
        else:
            try:
                employee = user.employee_profile
                department = employee.department
                selected_ids = HolidaySelection.objects.filter(
                    employee=employee
                ).values_list("holiday_id", flat=True)

                queryset = queryset.filter(
                    Q(holiday_type="COMPANY")
                    | Q(
                        holiday_type="DEPARTMENT",
                        department__iexact=department,
                    )
                    | Q(
                        holiday_type="OPTIONAL",
                        id__in=selected_ids,
                    )
                )
            except Exception:
                # If no employee profile is linked, expose only
                # company-wide active holidays.
                queryset = queryset.filter(holiday_type="COMPANY")

        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")

        if year:
            try:
                year = int(year)
                if not 1900 <= year <= 2100:
                    raise ValueError
                queryset = queryset.filter(
                    start_date__lte=date(year, 12, 31),
                    end_date__gte=date(year, 1, 1),
                )
            except ValueError:
                raise ValidationError({"year": "Provide a valid year."})

        if month:
            try:
                month = int(month)
                if not 1 <= month <= 12:
                    raise ValueError
                selected_year = int(
                    self.request.query_params.get("year", date.today().year)
                )
                month_start = date(selected_year, month, 1)
                if month == 12:
                    month_end = date(selected_year, 12, 31)
                else:
                    from calendar import monthrange
                    month_end = date(
                        selected_year, month,
                        monthrange(selected_year, month)[1],
                    )
                queryset = queryset.filter(
                    start_date__lte=month_end,
                    end_date__gte=month_start,
                )
            except ValueError:
                raise ValidationError({
                    "month": "Provide a month from 1 to 12 and a valid year."
                })

        return queryset.order_by("start_date", "name")

    def get_permissions(self):
        # Viewing the calendar is available to any authenticated user.
        # Only HR/Admin may create, edit, or delete holidays.
        if self.action in ("create", "update", "partial_update", "destroy"):
            if not is_hr_or_admin(self.request.user):
                raise PermissionDenied(
                    "Only HR or Admin can manage holidays."
                )
        return [permission() for permission in self.permission_classes]

    @action(detail=True, methods=["post"], url_path="select")
    def select_optional_holiday(self, request, pk=None):
        user = request.user

        if user.role != "EMPLOYEE":
            raise PermissionDenied(
                "Only employees can select optional holidays."
            )

        holiday = self.get_object()

        if holiday.holiday_type != "OPTIONAL":
            raise ValidationError(
                "Only optional holidays can be selected."
            )

        try:
            employee = user.employee_profile
        except Exception:
            raise ValidationError(
                "Your account is not linked to an employee profile."
            )

        HolidaySelection.objects.get_or_create(
            holiday=holiday,
            employee=employee,
        )

        return Response(
            {"message": "Optional holiday selected successfully."},
            status=status.HTTP_200_OK,
        )
