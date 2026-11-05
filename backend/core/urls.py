from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views as v

router = DefaultRouter()
router.register("projects", v.ProjectViewSet, basename="projects")
router.register("pages", v.PageViewSet, basename="pages")
router.register("bugs", v.BugViewSet, basename="bugs")
router.register("bug-histories", v.BugHistoryViewSet, basename="bug-histories")
router.register("users", v.UserViewSet, basename="users")
router.register("notifications", v.NotificationViewSet, basename="notifications")

urlpatterns = [
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", v.me, name="me"),
    path("dashboard/", v.dashboard, name="dashboard"),
    path("", include(router.urls)),
]
