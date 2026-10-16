
from rest_framework.routers import DefaultRouter
from .views import HolidayViewSet

router = DefaultRouter()
router.register("", HolidayViewSet, basename="holiday")

urlpatterns = router.urls
