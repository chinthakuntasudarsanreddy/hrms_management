
from django.urls import path

from .views import (
    NotificationListView,
    UnreadNotificationCountView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    NotificationPreferenceView,
    AdminBroadcastNotificationView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path(
        "unread-count/",
        UnreadNotificationCountView.as_view(),
        name="notification-unread-count",
    ),
    path(
        "mark-all-read/",
        MarkAllNotificationsReadView.as_view(),
        name="notification-mark-all-read",
    ),
    path(
        "preferences/",
        NotificationPreferenceView.as_view(),
        name="notification-preferences",
    ),
    path(
        "broadcast/",
        AdminBroadcastNotificationView.as_view(),
        name="notification-broadcast",
    ),
    path(
        "<int:pk>/read/",
        MarkNotificationReadView.as_view(),
        name="notification-mark-read",
    ),
]
