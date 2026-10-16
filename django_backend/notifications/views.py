from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from employees.models import Employee

from .models import Notification, NotificationPreference
from .serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    NotificationBroadcastSerializer,
)


class IsHRMSAdmin(BasePermission):
    """
    Allow only authenticated users with the custom ADMIN role.
    """

    message = "Only users with the ADMIN role can send broadcast notifications."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "ADMIN"
        )


def create_user_notification(user, title, message, notification_type):
    """
    Create a notification only when the recipient has enabled
    the relevant notification category.
    """

    preference_fields = {
        "GENERAL": "general_enabled",
        "LEAVE": "leave_enabled",
        "PAYROLL": "payroll_enabled",
        "ATTENDANCE": "attendance_enabled",
        "SYSTEM": "system_enabled",
    }

    preference_field = preference_fields.get(notification_type)

    if preference_field:
        preferences, _ = NotificationPreference.objects.get_or_create(
            user=user
        )

        if not getattr(preferences, preference_field):
            return None

    return Notification.objects.create(
        recipient=user,
        title=title,
        message=message,
        notification_type=notification_type,
    )


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    GET /api/notifications/?unread=true
    GET /api/notifications/?unread=false

    Users can see only their own notifications.
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(
            recipient=self.request.user
        )

        unread = self.request.query_params.get("unread")

        if unread == "true":
            queryset = queryset.filter(is_read=False)
        elif unread == "false":
            queryset = queryset.filter(is_read=True)

        return queryset


class UnreadNotificationCountView(APIView):
    """
    GET /api/notifications/unread-count/
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()

        return Response({"unread_count": count})


class MarkNotificationReadView(APIView):
    """
    POST /api/notifications/<id>/read/
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(
            Notification,
            pk=pk,
            recipient=request.user,
        )

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])

        return Response({
            "message": "Notification marked as read.",
            "id": notification.id,
            "is_read": notification.is_read,
        })


class MarkAllNotificationsReadView(APIView):
    """
    POST /api/notifications/mark-all-read/
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)

        return Response({
            "message": "All notifications marked as read.",
            "updated_count": updated_count,
        })


class NotificationPreferenceView(APIView):
    """
    GET   /api/notifications/preferences/
    PATCH /api/notifications/preferences/
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(
            user=request.user
        )

        serializer = NotificationPreferenceSerializer(preferences)

        return Response(serializer.data)

    def patch(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(
            user=request.user
        )

        serializer = NotificationPreferenceSerializer(
            preferences,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class AdminBroadcastNotificationView(APIView):
    """
    POST /api/notifications/broadcast/

    Only users with the custom ADMIN role can broadcast notifications.
    Supports the entire organization or a selected department.
    """

    permission_classes = [IsHRMSAdmin]

    def post(self, request):
        serializer = NotificationBroadcastSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        User = get_user_model()

        if data["target"] == "DEPARTMENT":
            employees = Employee.objects.filter(
                department__iexact=data["department"],
                user__isnull=False,
            ).exclude(status__iexact="INACTIVE")

            user_ids = employees.values_list("user_id", flat=True)

            recipients = User.objects.filter(
                pk__in=user_ids,
                is_active=True,
            )
        else:
            recipients = User.objects.filter(is_active=True)

        # Do not send the announcement to its sender.
        recipients = recipients.exclude(pk=request.user.pk)

        created_count = 0

        with transaction.atomic():
            for user in recipients.iterator(chunk_size=500):
                notification = create_user_notification(
                    user=user,
                    title=data["title"],
                    message=data["message"],
                    notification_type=data["notification_type"],
                )

                if notification is not None:
                    created_count += 1

        return Response(
            {
                "message": "Broadcast processed successfully.",
                "target": data["target"],
                "department": data.get("department"),
                "created_count": created_count,
            },
            status=status.HTTP_201_CREATED,
        )
