from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, permissions, serializers, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from . import models as m

class BasePermission(permissions.BasePermission):
    def has_permission(self, req, view):
        return bool(req.user and req.user.is_authenticated)

class IsSuperAdminOrReadOnly(permissions.BasePermission):
    message = "Only Super Admin has access to create or manage user roles."

    def has_permission(self, req, view):
        if not (req.user and req.user.is_authenticated):
            return False
        if req.method in permissions.SAFE_METHODS:
            return True
        return req.user.role == "Super Admin" or req.user.is_superuser

def format_user_detail(user):
    if not user:
        return None
    full_name = f"{user.first_name} {user.last_name}".strip()
    return {
        "id": user.id,
        "username": user.username,
        "full_name": full_name or user.username,
        "role": user.role,
        "email": user.email or "",
    }

class SoftDeleteViewSetMixin:
    module_name = "Record"

    def get_module_name(self):
        return getattr(self, "module_name", "Record")

    def get_queryset(self):
        qs = super().get_queryset()
        include_deleted = self.request.query_params.get("include_deleted") == "true"
        is_deleted_filter = self.request.query_params.get("is_deleted") == "true"

        if self.action in ["restore", "permanent"]:
            return qs
        if self.action == "deleted" or is_deleted_filter:
            return qs.filter(is_deleted=True)
        if not include_deleted:
            return qs.filter(is_deleted=False)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.query_params.get("permanent") == "true":
            record_name = str(instance)
            instance.delete()
            m.DeleteAuditLog.objects.create(
                module=self.get_module_name(),
                record_id=kwargs.get("pk"),
                record_name=record_name,
                action="Permanently Deleted",
                user=request.user
            )
            return Response({"detail": f"{self.get_module_name()} permanently deleted."}, status=status.HTTP_200_OK)

        if isinstance(instance, m.User) and instance.id == request.user.id:
            return Response({"detail": "You cannot delete your own user account."}, status=status.HTTP_400_BAD_REQUEST)

        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = request.user
        if isinstance(instance, m.User):
            instance.is_active = False
        instance.save()

        m.DeleteAuditLog.objects.create(
            module=self.get_module_name(),
            record_id=instance.id,
            record_name=str(instance),
            action="Deleted",
            user=request.user
        )
        return Response({"detail": f"{self.get_module_name()} moved to Delete History."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.is_deleted = False
        instance.deleted_at = None
        instance.deleted_by = None
        if isinstance(instance, m.User):
            instance.is_active = True
        instance.save()

        m.DeleteAuditLog.objects.create(
            module=self.get_module_name(),
            record_id=instance.id,
            record_name=str(instance),
            action="Restored",
            user=request.user
        )
        return Response({"detail": f"{self.get_module_name()} restored successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def deleted(self, request):
        qs = self.filter_queryset(self.get_queryset().filter(is_deleted=True))
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["delete"])
    def permanent(self, request, pk=None):
        instance = self.get_object()
        record_name = str(instance)
        instance.delete()
        m.DeleteAuditLog.objects.create(
            module=self.get_module_name(),
            record_id=pk,
            record_name=record_name,
            action="Permanently Deleted",
            user=request.user
        )
        return Response({"detail": f"{self.get_module_name()} permanently deleted."}, status=status.HTTP_200_OK)

# User Serializer & ViewSet
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    created_by_name = serializers.ReadOnlyField(source="created_by.username")
    created_by_user = serializers.SerializerMethodField()
    deleted_by_name = serializers.ReadOnlyField(source="deleted_by.username")
    deleted_by_user = serializers.SerializerMethodField()

    class Meta:
        model = m.User
        fields = [
            "id", "username", "email", "first_name", "last_name", "role", "is_active", "password",
            "created_by", "created_by_name", "created_by_user",
            "is_deleted", "deleted_at", "deleted_by", "deleted_by_name", "deleted_by_user", "date_joined"
        ]

    def get_created_by_user(self, obj):
        return format_user_detail(obj.created_by)

    def get_deleted_by_user(self, obj):
        return format_user_detail(obj.deleted_by)

    def create(self, validated_data):
        pw = validated_data.pop("password", None)
        user = m.User(**validated_data)
        user.set_password(pw or "Cliccot123!")
        user.save()
        return user

    def update(self, instance, validated_data):
        pw = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if pw:
            user.set_password(pw)
            user.save()
        return user

class UserViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    module_name = "User"
    queryset = m.User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdminOrReadOnly]
    search_fields = ["username", "email", "first_name", "last_name"]
    filterset_fields = ["role", "is_active", "is_deleted"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

# Project Serializer & ViewSet
class ProjectSerializer(serializers.ModelSerializer):
    pages_count = serializers.SerializerMethodField()
    bugs_count = serializers.SerializerMethodField()
    open_bugs_count = serializers.SerializerMethodField()
    created_by_name = serializers.ReadOnlyField(source="created_by.username")
    created_by_user = serializers.SerializerMethodField()
    deleted_by_name = serializers.ReadOnlyField(source="deleted_by.username")
    deleted_by_user = serializers.SerializerMethodField()

    class Meta:
        model = m.Project
        fields = "__all__"

    def get_created_by_user(self, obj):
        return format_user_detail(obj.created_by)

    def get_deleted_by_user(self, obj):
        return format_user_detail(obj.deleted_by)

    def get_pages_count(self, obj):
        return obj.pages.filter(is_deleted=False).count()

    def get_bugs_count(self, obj):
        return obj.bugs.filter(is_deleted=False).count()

    def get_open_bugs_count(self, obj):
        return obj.bugs.filter(is_deleted=False).exclude(status__in=["Verified", "Closed"]).count()

class ProjectViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    module_name = "Project"
    queryset = m.Project.objects.all().order_by("-id")
    serializer_class = ProjectSerializer
    permission_classes = [BasePermission]
    search_fields = ["name", "description"]
    filterset_fields = ["status", "is_deleted"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

# Page Serializer & ViewSet
class PageSerializer(serializers.ModelSerializer):
    project_name = serializers.ReadOnlyField(source="project.name")
    display_name = serializers.SerializerMethodField()
    bugs_count = serializers.SerializerMethodField()
    open_bugs_count = serializers.SerializerMethodField()
    created_by_name = serializers.ReadOnlyField(source="created_by.username")
    created_by_user = serializers.SerializerMethodField()
    deleted_by_name = serializers.ReadOnlyField(source="deleted_by.username")
    deleted_by_user = serializers.SerializerMethodField()

    class Meta:
        model = m.Page
        fields = "__all__"

    def get_created_by_user(self, obj):
        creator = obj.created_by or (obj.project.created_by if obj.project else None)
        return format_user_detail(creator)

    def get_deleted_by_user(self, obj):
        return format_user_detail(obj.deleted_by)

    def get_display_name(self, obj):
        if obj.sub_page_name:
            return f"{obj.name} > {obj.sub_page_name}"
        return obj.name

    def get_bugs_count(self, obj):
        return obj.bugs.filter(is_deleted=False).count()

    def get_open_bugs_count(self, obj):
        return obj.bugs.filter(is_deleted=False).exclude(status__in=["Verified", "Closed"]).count()

class PageViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    module_name = "Page"
    queryset = m.Page.objects.all().order_by("-id")
    serializer_class = PageSerializer
    permission_classes = [BasePermission]
    search_fields = ["name", "sub_page_name", "url_path", "description"]
    filterset_fields = ["project", "status", "is_deleted"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

# Bug History Serializer & ViewSet
class BugHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source="user.username")
    bug_code = serializers.ReadOnlyField(source="bug.code")
    bug_title = serializers.ReadOnlyField(source="bug.title")

    class Meta:
        model = m.BugHistory
        fields = "__all__"

class BugHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = m.BugHistory.objects.all().order_by("-created_at", "-id")
    serializer_class = BugHistorySerializer
    permission_classes = [BasePermission]
    filterset_fields = ["bug", "user", "action"]
    search_fields = ["notes", "action"]

# Bug Serializer & ViewSet
class BugSerializer(serializers.ModelSerializer):
    code = serializers.ReadOnlyField()
    project_name = serializers.ReadOnlyField(source="project.name")
    page_name = serializers.SerializerMethodField()
    reporter_name = serializers.ReadOnlyField(source="reported_by.username")
    developer_name = serializers.ReadOnlyField(source="assigned_developer.username")
    tester_name = serializers.ReadOnlyField(source="assigned_tester.username")
    created_by_name = serializers.SerializerMethodField()
    created_by_user = serializers.SerializerMethodField()
    deleted_by_name = serializers.ReadOnlyField(source="deleted_by.username")
    deleted_by_user = serializers.SerializerMethodField()

    class Meta:
        model = m.Bug
        fields = "__all__"

    def get_created_by_name(self, obj):
        creator = obj.created_by or obj.reported_by
        return creator.username if creator else ""

    def get_created_by_user(self, obj):
        creator = obj.created_by or obj.reported_by
        return format_user_detail(creator)

    def get_deleted_by_user(self, obj):
        return format_user_detail(obj.deleted_by)

    def get_page_name(self, obj):
        if not obj.page:
            return ""
        if obj.page.sub_page_name:
            return f"{obj.page.name} > {obj.page.sub_page_name}"
        return obj.page.name

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get("sub_page_name") and instance.page and instance.page.sub_page_name:
            data["sub_page_name"] = instance.page.sub_page_name
        return data

    def validate(self, data):
        project = data.get("project") or (self.instance.project if self.instance else None)
        page = data.get("page") if "page" in data else (self.instance.page if self.instance else None)
        if page and project and page.project_id != project.id:
            raise serializers.ValidationError({"page": f"Page '{page.name}' does not belong to project '{project.name}'."})
        status = data.get("status") or (self.instance.status if self.instance else None)
        fix_notes = data.get("fix_notes") if "fix_notes" in data else (self.instance.fix_notes if self.instance else "")
        if status == "Fixed" and not str(fix_notes or "").strip():
            candidate = data.get("steps_to_reproduce") or ""
            if candidate.strip():
                data["fix_notes"] = candidate.strip()
            else:
                raise serializers.ValidationError({"fix_notes": "Every bug fix must include a description of what was changed before submitting or marking as Fixed."})
        return data

class BugViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    module_name = "Bug"
    serializer_class = BugSerializer
    permission_classes = [BasePermission]
    search_fields = ["title", "description", "sub_page_name", "steps_to_reproduce", "fix_notes", "verification_notes"]
    filterset_fields = ["project", "sub_page_name", "severity", "priority", "status", "assigned_developer", "assigned_tester", "reported_by", "is_deleted"]

    def get_queryset(self):
        qs = m.Bug.objects.all().order_by("-id")
        page_id = self.request.query_params.get("page_id") or self.request.query_params.get("page_filter")
        if page_id and str(page_id).isdigit():
            qs = qs.filter(page_id=int(page_id))

        include_deleted = self.request.query_params.get("include_deleted") == "true"
        is_deleted_filter = self.request.query_params.get("is_deleted") == "true"

        if self.action in ["restore", "permanent"]:
            return qs
        if self.action == "deleted" or is_deleted_filter:
            return qs.filter(is_deleted=True)
        if not include_deleted:
            return qs.filter(is_deleted=False)
        return qs

    def perform_create(self, serializer):
        reporter = self.request.user
        assigned_dev = serializer.validated_data.get("assigned_developer")
        page = serializer.validated_data.get("page")
        sub_page = serializer.validated_data.get("sub_page_name") or (page.sub_page_name if page else "")
        init_status = serializer.validated_data.get("status") or ("Assigned" if assigned_dev else "New")
        bug = serializer.save(reported_by=reporter, created_by=reporter, status=init_status, sub_page_name=sub_page)

        # Log history
        m.BugHistory.objects.create(
            bug=bug,
            user=reporter,
            action="Created",
            status_before="",
            status_after=bug.status,
            notes=f"Bug created by {reporter.username} ({reporter.role}). Assigned to developer: {assigned_dev.username if assigned_dev else 'None'}."
        )

        if assigned_dev:
            m.Notification.objects.create(
                user=assigned_dev,
                message=f"New bug {bug.code} assigned to you: '{bug.title[:50]}'"
            )

    def perform_update(self, serializer):
        old_bug = m.Bug.objects.get(pk=serializer.instance.pk)
        old_status = old_bug.status
        old_dev = old_bug.assigned_developer
        old_tester = old_bug.assigned_tester

        bug = serializer.save()

        # Check for status or assignment change
        notes_parts = []
        if old_status != bug.status:
            notes_parts.append(f"Status changed from '{old_status}' to '{bug.status}'")
        if old_dev != bug.assigned_developer:
            notes_parts.append(f"Developer changed to '{bug.assigned_developer.username if bug.assigned_developer else 'None'}'")
        if old_tester != bug.assigned_tester:
            notes_parts.append(f"Tester changed to '{bug.assigned_tester.username if bug.assigned_tester else 'None'}'")

        if notes_parts:
            m.BugHistory.objects.create(
                bug=bug,
                user=self.request.user,
                action="Updated",
                status_before=old_status,
                status_after=bug.status,
                notes="; ".join(notes_parts)
            )

        if bug.assigned_developer and bug.assigned_developer != old_dev:
            m.Notification.objects.create(
                user=bug.assigned_developer,
                message=f"Bug {bug.code} assigned to you: '{bug.title[:50]}'"
            )

    # 1. Developer starts progress
    @action(detail=True, methods=["post"])
    def start_progress(self, request, pk=None):
        bug = self.get_object()
        old_status = bug.status
        bug.status = "In Progress"
        if not bug.assigned_developer:
            bug.assigned_developer = request.user
        bug.save()

        m.BugHistory.objects.create(
            bug=bug,
            user=request.user,
            action="In Progress",
            status_before=old_status,
            status_after="In Progress",
            notes=f"Developer {request.user.username} started fixing the issue."
        )
        return Response(BugSerializer(bug).data)

    # 2. Developer fixes the issue
    @action(detail=True, methods=["post"])
    def fix(self, request, pk=None):
        bug = self.get_object()
        old_status = bug.status

        fix_notes = request.data.get("fix_notes", "").strip()
        root_cause = request.data.get("root_cause", "").strip()
        code_changes = request.data.get("code_changes", "").strip()

        if not fix_notes:
            return Response(
                {"error": "Every bug fix must include a description of what was changed before submitting."},
                status=status.HTTP_400_BAD_REQUEST
            )

        bug.status = "Fixed"
        bug.fix_notes = fix_notes
        if root_cause:
            bug.root_cause = root_cause
        if code_changes:
            bug.code_changes = code_changes
        bug.save()

        notes = f"Developer {request.user.username} marked bug as Fixed. Changes made: {fix_notes}"

        m.BugHistory.objects.create(
            bug=bug,
            user=request.user,
            action="Fixed",
            status_before=old_status,
            status_after="Fixed",
            notes=notes
        )

        # Notify Tester if assigned, else reporter
        if bug.assigned_tester:
            m.Notification.objects.create(
                user=bug.assigned_tester,
                message=f"Bug {bug.code} marked 'Fixed' by {request.user.username}. Ready for your verification."
            )
        elif bug.reported_by:
            m.Notification.objects.create(
                user=bug.reported_by,
                message=f"Bug {bug.code} marked 'Fixed' by {request.user.username}. Ready for verification."
            )

        return Response(BugSerializer(bug).data)

    # 3. Tester reopens the bug
    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        bug = self.get_object()
        old_status = bug.status

        reopen_reason = request.data.get("reopen_reason", "").strip()
        new_dev_id = request.data.get("assigned_developer")

        if not reopen_reason:
            return Response({"error": "A reason is required to reopen the bug."}, status=status.HTTP_400_BAD_REQUEST)

        bug.status = "Reopened"
        bug.reopen_reason = reopen_reason
        bug.reopen_count += 1

        if new_dev_id:
            try:
                new_dev = m.User.objects.get(pk=new_dev_id)
                bug.assigned_developer = new_dev
            except m.User.DoesNotExist:
                pass

        bug.save()

        user_role = getattr(request.user, "role", "Tester")
        dev_name = bug.assigned_developer.username if bug.assigned_developer else "None"
        m.BugHistory.objects.create(
            bug=bug,
            user=request.user,
            action="Reopened",
            status_before=old_status,
            status_after="Reopened",
            notes=f"Reopened by {request.user.username} ({user_role}). Reason: '{reopen_reason}'. Assigned to: {dev_name} (Reopen #{bug.reopen_count})."
        )

        if bug.assigned_developer:
            m.Notification.objects.create(
                user=bug.assigned_developer,
                message=f"Bug {bug.code} was REOPENED by {request.user.username}: '{reopen_reason[:80]}'"
            )

        return Response(BugSerializer(bug).data)

    # 4. Tester verifies the fix
    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        bug = self.get_object()
        old_status = bug.status

        verification_notes = request.data.get("verification_notes", "").strip()
        mark_closed = request.data.get("close", False)
        new_status = "Closed" if mark_closed else "Verified"

        bug.status = new_status
        if verification_notes:
            bug.verification_notes = verification_notes
        if not bug.assigned_tester and request.user.role == "Tester":
            bug.assigned_tester = request.user
        bug.save()

        m.BugHistory.objects.create(
            bug=bug,
            user=request.user,
            action=new_status,
            status_before=old_status,
            status_after=new_status,
            notes=f"Verified by Tester {request.user.username}. Notes: {verification_notes or 'Issue confirmed resolved on page.'}"
        )

        if bug.reported_by and bug.reported_by != request.user:
            m.Notification.objects.create(
                user=bug.reported_by,
                message=f"Bug {bug.code} has been verified and confirmed resolved by {request.user.username}."
            )
        if bug.assigned_developer:
            m.Notification.objects.create(
                user=bug.assigned_developer,
                message=f"Great job! Bug {bug.code} fix was verified by {request.user.username}."
            )

        return Response(BugSerializer(bug).data)

    # 5. Close bug
    @action(detail=True, methods=["post"])
    def close_bug(self, request, pk=None):
        bug = self.get_object()
        old_status = bug.status
        bug.status = "Closed"
        bug.save()

        m.BugHistory.objects.create(
            bug=bug,
            user=request.user,
            action="Closed",
            status_before=old_status,
            status_after="Closed",
            notes=f"Bug closed by {request.user.username}."
        )
        return Response(BugSerializer(bug).data)

# Delete Audit Log ViewSet
class DeleteAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source="user.username")
    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = m.DeleteAuditLog
        fields = "__all__"

    def get_user_detail(self, obj):
        return format_user_detail(obj.user)

class DeleteAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = m.DeleteAuditLog.objects.all().order_by("-created_at", "-id")
    serializer_class = DeleteAuditLogSerializer
    permission_classes = [BasePermission]
    filterset_fields = ["module", "action", "user"]
    search_fields = ["record_name", "action"]

# Notification ViewSet
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = m.Notification
        fields = "__all__"

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [BasePermission]

    def get_queryset(self):
        return m.Notification.objects.filter(user=self.request.user).order_by("-created_at")

# Me Endpoint
@api_view(["GET"])
def me(req):
    u = req.user
    return Response({
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "role": u.role,
        "is_staff": u.is_staff,
        "is_superuser": u.is_superuser
    })

# Dashboard Endpoint
@api_view(["GET"])
def dashboard(req):
    pid = req.query_params.get("project")

    bugs_qs = m.Bug.objects.filter(is_deleted=False)
    pages_qs = m.Page.objects.filter(is_deleted=False)
    if pid:
        bugs_qs = bugs_qs.filter(project_id=pid)
        pages_qs = pages_qs.filter(project_id=pid)

    status_counts = dict(bugs_qs.values_list("status").annotate(c=Count("id")))
    severity_counts = dict(bugs_qs.values_list("severity").annotate(c=Count("id")))

    open_statuses = ["New", "Assigned", "In Progress", "Reopened"]
    open_count = sum(status_counts.get(s, 0) for s in open_statuses)
    resolved_count = status_counts.get("Verified", 0) + status_counts.get("Closed", 0)

    # Recent history
    recent_history = list(
        m.BugHistory.objects.select_related("bug", "user")
        .order_by("-created_at")[:10]
        .values("id", "bug__id", "bug_id", "action", "status_before", "status_after", "notes", "created_at", "user__username")
    )

    # Developer workload
    dev_stats = []
    devs = m.User.objects.filter(role__in=["Developer", "Admin", "Super Admin"])
    for d in devs:
        dev_bugs = bugs_qs.filter(assigned_developer=d)
        total = dev_bugs.count()
        if total > 0 or d.role == "Developer":
            dev_stats.append({
                "id": d.id,
                "username": d.username,
                "total": total,
                "open": dev_bugs.exclude(status__in=["Verified", "Closed", "Fixed"]).count(),
                "fixed": dev_bugs.filter(status="Fixed").count(),
                "reopened": dev_bugs.filter(status="Reopened").count(),
                "resolved": dev_bugs.filter(status__in=["Verified", "Closed"]).count()
            })

    # Tester verification queue
    tester_queue = list(
        bugs_qs.filter(status="Fixed")
        .select_related("project", "page", "assigned_developer", "assigned_tester")
        .values("id", "title", "severity", "priority", "project__name", "page__name", "assigned_developer__username", "assigned_tester__username", "updated_at")[:8]
    )

    # Reopened bugs queue (urgent developer attention)
    reopened_queue = list(
        bugs_qs.filter(status="Reopened")
        .select_related("project", "page", "assigned_developer")
        .values("id", "title", "severity", "reopen_count", "reopen_reason", "project__name", "page__name", "assigned_developer__username", "updated_at")[:8]
    )

    return Response({
        "projects_count": m.Project.objects.filter(is_deleted=False).count(),
        "pages_count": pages_qs.count(),
        "total_bugs": bugs_qs.count(),
        "open_bugs": open_count,
        "in_progress_bugs": status_counts.get("In Progress", 0),
        "fixed_bugs": status_counts.get("Fixed", 0),
        "reopened_bugs": status_counts.get("Reopened", 0),
        "verified_bugs": status_counts.get("Verified", 0),
        "closed_bugs": status_counts.get("Closed", 0),
        "resolved_bugs": resolved_count,
        "critical_bugs": severity_counts.get("Critical", 0),
        "status_distribution": [{"name": k, "value": v} for k, v in status_counts.items()],
        "severity_distribution": [{"name": k, "value": v} for k, v in severity_counts.items()],
        "recent_history": recent_history,
        "dev_workload": dev_stats,
        "tester_queue": tester_queue,
        "reopened_queue": reopened_queue,
    })
