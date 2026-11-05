from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models

U = settings.AUTH_USER_MODEL
def C(*v): return [(x, x) for x in v]

class Stamp(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(U, null=True, blank=True, on_delete=models.SET_NULL, related_name="%(app_label)s_%(class)s_deleted")

    class Meta:
        abstract = True
        ordering = ["-id"]

class User(AbstractUser):
    ROLES = C("Admin", "Developer", "Tester", "Super Admin")
    role = models.CharField(max_length=20, choices=ROLES, default="Tester", db_index=True)
    created_by = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="created_users")
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="deleted_users")

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        if self.is_superuser and self.role not in ["Super Admin", "Admin"]:
            self.role = "Super Admin"
        super().save(*args, **kwargs)

class Project(Stamp):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(U, null=True, blank=True, on_delete=models.SET_NULL, related_name="managed_projects")
    status = models.CharField(max_length=20, choices=C("Active", "Completed", "On Hold"), default="Active", db_index=True)

    def __str__(self):
        return self.name

class Page(Stamp):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="pages")
    name = models.CharField(max_length=200) # Main Page Name
    sub_page_name = models.CharField(max_length=200, blank=True) # Sub Page Name
    url_path = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(U, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_pages")
    status = models.CharField(max_length=20, choices=C("Active", "In Development", "Archived"), default="Active", db_index=True)

    class Meta(Stamp.Meta):
        unique_together = ("project", "name", "sub_page_name")

    def __str__(self):
        if self.sub_page_name:
            return f"{self.project.name} - {self.name} > {self.sub_page_name}"
        return f"{self.project.name} - {self.name}"

class Bug(Stamp):
    SEVERITY_CHOICES = C("Critical", "Major", "Minor", "Trivial")
    PRIORITY_CHOICES = C("High", "Medium", "Low")
    STATUS_CHOICES = C("New", "Assigned", "In Progress", "Fixed", "Reopened", "Verified", "Closed")

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="bugs")
    page = models.ForeignKey(Page, null=True, blank=True, on_delete=models.SET_NULL, related_name="bugs")
    sub_page_name = models.CharField(max_length=200, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    steps_to_reproduce = models.TextField(blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="Minor", db_index=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="Medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="New", db_index=True)

    # Roles involved
    reported_by = models.ForeignKey(U, null=True, blank=True, on_delete=models.SET_NULL, related_name="reported_bugs") # Tester
    created_by = models.ForeignKey(U, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_bugs")
    assigned_developer = models.ForeignKey(U, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_dev_bugs") # Developer
    assigned_tester = models.ForeignKey(U, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_tester_bugs") # Tester

    # Developer fix fields
    fix_notes = models.TextField(blank=True)
    root_cause = models.TextField(blank=True)
    code_changes = models.TextField(blank=True)

    # Tester verification & Reopen fields
    verification_notes = models.TextField(blank=True)
    reopen_reason = models.TextField(blank=True)
    reopen_count = models.PositiveIntegerField(default=0)

    @property
    def code(self):
        return f"BUG-{self.pk:04d}"

    def __str__(self):
        return f"{self.code}: {self.title}"

class BugHistory(Stamp):
    bug = models.ForeignKey(Bug, on_delete=models.CASCADE, related_name="histories")
    user = models.ForeignKey(U, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=50) # "Created", "Assigned", "In Progress", "Fixed", "Reopened", "Verified", "Closed"
    status_before = models.CharField(max_length=20, blank=True)
    status_after = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)

    class Meta(Stamp.Meta):
        ordering = ["-created_at", "-id"]

class Notification(Stamp):
    user = models.ForeignKey(U, on_delete=models.CASCADE, related_name="notifications")
    message = models.CharField(max_length=300)
    is_read = models.BooleanField(default=False)

class DeleteAuditLog(Stamp):
    MODULE_CHOICES = C("Project", "Page", "Bug", "User")
    module = models.CharField(max_length=20, choices=MODULE_CHOICES, db_index=True)
    record_id = models.IntegerField(db_index=True)
    record_name = models.CharField(max_length=255)
    action = models.CharField(max_length=20, default="Deleted") # "Deleted", "Restored", "Permanently Deleted"
    user = models.ForeignKey(U, null=True, blank=True, on_delete=models.SET_NULL, related_name="delete_audit_actions")
    details = models.JSONField(default=dict, blank=True)

    class Meta(Stamp.Meta):
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"[{self.module}] {self.record_name} - {self.action} by {self.user}"
