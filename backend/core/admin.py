from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from . import models as m

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Role", {"fields": ("role",)}),
    )
    list_display = ("username", "email", "first_name", "last_name", "role", "is_staff")
    list_filter = ("role", "is_staff", "is_superuser", "is_active")

admin.site.register(m.User, CustomUserAdmin)
for model in [m.Project, m.Page, m.Bug, m.BugHistory, m.Notification]:
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass
