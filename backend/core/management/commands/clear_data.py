from django.core.management.base import BaseCommand
from core import models as m

class Command(BaseCommand):
    help = "Delete all project data, pages, bugs, bug histories, and notifications while preserving users."

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete-users",
            action="store_true",
            help="Also delete non-admin users.",
        )

    def handle(self, *args, **options):
        delete_users = options.get("delete_users", False)

        m.BugHistory.objects.all().delete()
        m.Bug.objects.all().delete()
        m.Page.objects.all().delete()
        m.Project.objects.all().delete()
        m.Notification.objects.all().delete()

        if delete_users:
            m.User.objects.exclude(username__in=["admin", "superadmin"]).delete()
            self.stdout.write("[OK] Deleted all projects, pages, bugs, and non-admin users.")
        else:
            user_count = m.User.objects.count()
            self.stdout.write(f"[OK] Cleared all projects, pages, and bugs. Preserved {user_count} user accounts.")
