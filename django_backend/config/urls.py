
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/employees/", include("employees.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/holidays/", include("holidays.urls")),
    path("api/", include("shifts.urls")),
]
