import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from core import models as m

class Command(BaseCommand):
    help = "Seed database with realistic sample data for Project, Pages, Bugs, and User Roles (Tester, Developer, Admin)."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Bug Management System data...")

        # 1. Users & Roles (Tester, Developer, Admin)
        users_spec = [
            ("myadmin", "myadmin@cliccot.io", "My", "Admin", "Super Admin", "Admin123!"),
            ("superadmin", "superadmin@cliccot.io", "Super", "Admin", "Super Admin", "Admin123!"),
            ("admin", "admin@cliccot.io", "System", "Admin", "Admin", "Admin123!"),
            ("tester.priya", "priya@cliccot.io", "Priya", "Patel", "Tester", "Tester123!"),
            ("tester.alex", "alex@cliccot.io", "Alex", "Rodriguez", "Tester", "Tester123!"),
            ("tester.sarah", "sarah@cliccot.io", "Sarah", "Smith", "Tester", "Tester123!"),
            ("tester.clara", "clara@cliccot.io", "Clara", "Oswald", "Tester", "Tester123!"),
            ("dev.karthi", "karthi@cliccot.io", "Karthi", "Raman", "Developer", "Dev12345!"),
            ("dev.elena", "elena@cliccot.io", "Elena", "Rostova", "Developer", "Dev12345!"),
            ("dev.david", "david@cliccot.io", "David", "Kim", "Developer", "Dev12345!"),
        ]

        users = {}
        for username, email, fn, ln, role, pw in users_spec:
            u, created = m.User.objects.get_or_create(
                username=username,
                defaults={"email": email, "first_name": fn, "last_name": ln, "role": role}
            )
            u.role = role
            u.is_staff = role in ["Super Admin", "Admin"]
            u.is_superuser = (role == "Super Admin")
            u.set_password(pw)
            u.save()
            users[username] = u

        # Ensure existing user accounts like Kiruba or Karthi are properly configured
        for u in m.User.objects.all():
            if u.username == "Karthi":
                u.role = "Developer"
                u.save()
                users["dev.karthi"] = u
            elif u.username == "Kiruba":
                u.role = "Super Admin"
                u.save()
            elif u.username.startswith("teacher."):
                u.delete()

        self.stdout.write(f"[OK] Seeded {len(users)} users across Tester, Developer, and Admin roles.")

        # 2. Projects
        p1, _ = m.Project.objects.update_or_create(
            name="Saap 2.0 Enterprise Suite",
            defaults={
                "description": "Next-generation enterprise management platform with real-time billing, inventory tracking, and reporting.",
                "created_by": users.get("admin"),
                "status": "Active"
            }
        )

        p2, _ = m.Project.objects.update_or_create(
            name="EduLearn Academy Portal",
            defaults={
                "description": "Interactive online learning portal featuring video streaming, assignments, and curriculum tracking.",
                "created_by": users.get("admin"),
                "status": "Active"
            }
        )

        p3, _ = m.Project.objects.update_or_create(
            name="QuizMaster Exam Engine",
            defaults={
                "description": "High-concurrency proctored examination engine with live countdown timers and automated gradebooks.",
                "created_by": users.get("admin"),
                "status": "Active"
            }
        )

        self.stdout.write("[OK] Seeded 3 projects.")

        # 3. Pages under each project
        # Saap 2.0 pages
        pg_login, _ = m.Page.objects.update_or_create(project=p1, name="Login & Authentication", defaults={"url_path": "/login", "description": "User login, OAuth, and password recovery interface", "status": "Active"})
        pg_billing, _ = m.Page.objects.update_or_create(project=p1, name="Billing & Checkout", defaults={"url_path": "/billing", "description": "Subscription payments, coupon checkout, and Stripe webhooks", "status": "Active"})
        pg_inventory, _ = m.Page.objects.update_or_create(project=p1, name="Inventory Dashboard", defaults={"url_path": "/inventory", "description": "Real-time stock management and warehouse alerts", "status": "Active"})
        pg_reports, _ = m.Page.objects.update_or_create(project=p1, name="Reports & Analytics", defaults={"url_path": "/reports", "description": "Financial and operational PDF/CSV data exports", "status": "Active"})

        # EduLearn pages
        pg_courses, _ = m.Page.objects.update_or_create(project=p2, name="Course Catalog & Enrollment", defaults={"url_path": "/courses", "description": "Course search, filtering, and student enrollment", "status": "Active"})
        pg_submission, _ = m.Page.objects.update_or_create(project=p2, name="Assignment Submission", defaults={"url_path": "/assignments/submit", "description": "File upload and plagiarism check for student assignments", "status": "Active"})
        pg_video, _ = m.Page.objects.update_or_create(project=p2, name="Video Player & Transcripts", defaults={"url_path": "/watch", "description": "HLS video stream player with synchronized captions", "status": "Active"})

        # QuizMaster pages
        pg_exam, _ = m.Page.objects.update_or_create(project=p3, name="Exam Timer & Question Navigator", defaults={"url_path": "/exam/take", "description": "Live exam test runner with anti-cheat detection", "status": "Active"})
        pg_gradebook, _ = m.Page.objects.update_or_create(project=p3, name="Result Gradebook", defaults={"url_path": "/results", "description": "Score tabulation and percentile generation", "status": "Active"})

        self.stdout.write("[OK] Seeded 9 pages across projects.")

        # 4. Bugs created by Testers and assigned to Developers
        # Bug 1: Assigned
        b1, _ = m.Bug.objects.update_or_create(
            title="Stripe webhook 500 error on recurring subscription renewal",
            defaults={
                "project": p1,
                "page": pg_billing,
                "description": "When customer subscription renews, the backend receives invoice.payment_succeeded webhook but crashes due to missing invoice item ID in metadata.",
                "steps_to_reproduce": "1. Go to Billing & Checkout\n2. Trigger a subscription renewal webhook via Stripe CLI\n3. Observe 500 Internal Server Error in logs",
                "severity": "Critical",
                "priority": "High",
                "status": "Assigned",
                "reported_by": users.get("tester.priya"),
                "assigned_developer": users.get("dev.karthi"),
                "assigned_tester": users.get("tester.priya"),
            }
        )

        # Bug 2: In Progress
        b2, _ = m.Bug.objects.update_or_create(
            title="OAuth Google callback state parameter validation mismatch on Safari",
            defaults={
                "project": p1,
                "page": pg_login,
                "description": "On macOS and iOS Safari, the session cookie is blocked as third-party, causing CSRF state validation mismatch on login callback.",
                "steps_to_reproduce": "1. Open Safari in standard or incognito mode\n2. Click 'Sign in with Google'\n3. Authorize Google account\n4. Redirect results in 'Invalid CSRF state' error",
                "severity": "Major",
                "priority": "High",
                "status": "In Progress",
                "reported_by": users.get("tester.sarah"),
                "assigned_developer": users.get("dev.karthi"),
                "assigned_tester": users.get("tester.sarah"),
            }
        )

        # Bug 3: Fixed (Ready for Tester Verification)
        b3, _ = m.Bug.objects.update_or_create(
            title="Auto-submit does not trigger when countdown reaches 00:00",
            defaults={
                "project": p3,
                "page": pg_exam,
                "description": "When the exam timer reaches zero, the form is supposed to auto-save and redirect to results, but it stays idle on the exam page.",
                "steps_to_reproduce": "1. Start a mock exam\n2. Wait for timer to reach 00:00 or fast-forward system clock\n3. Page remains on question 10 without submitting",
                "severity": "Critical",
                "priority": "High",
                "status": "Fixed",
                "reported_by": users.get("tester.clara"),
                "assigned_developer": users.get("dev.david"),
                "assigned_tester": users.get("tester.priya"),
                "fix_notes": "Added guaranteed fallback trigger on timer expiration: clearInterval() followed immediately by sync form dispatch and disabled navigation buttons.",
                "root_cause": "Race condition between setInterval decrement and window blur event handler which paused JavaScript execution.",
                "code_changes": "exam-runner.js: lines 142-168 (+24, -6)",
            }
        )

        # Bug 4: Reopened (Tester tested, fix failed, reopened and assigned back to developer)
        b4, _ = m.Bug.objects.update_or_create(
            title="Discount promo code applies twice when switching cart currency",
            defaults={
                "project": p1,
                "page": pg_billing,
                "description": "Applying coupon 'SAVE20' gives 20% discount. If user switches currency from USD to EUR, the coupon is applied a second time, resulting in 40% discount.",
                "steps_to_reproduce": "1. Add item ($100) to checkout\n2. Apply promo code 'SAVE20'\n3. Toggle currency dropdown to EUR\n4. Total price shows 64 EUR instead of 80 EUR",
                "severity": "Major",
                "priority": "High",
                "status": "Reopened",
                "reported_by": users.get("tester.priya"),
                "assigned_developer": users.get("dev.karthi"),
                "assigned_tester": users.get("tester.priya"),
                "fix_notes": "Reset cart discount state before currency recalculation.",
                "reopen_reason": "Re-tested in QA staging with coupon SAVE20: Discount is still calculated twice when cart contains multiple line items and user switches between USD and GBP.",
                "reopen_count": 1,
            }
        )

        # Bug 5: Verified & Closed (Tester confirmed fix on the page)
        b5, _ = m.Bug.objects.update_or_create(
            title="Search filter by category returns empty list on pagination page 2",
            defaults={
                "project": p2,
                "page": pg_courses,
                "description": "Filtering by 'Computer Science' works on page 1, but clicking page 2 loses the query param and returns empty results.",
                "steps_to_reproduce": "1. Go to /courses\n2. Select 'Computer Science' category filter\n3. Click page 2 in pagination\n4. Shows 'No courses found'",
                "severity": "Minor",
                "priority": "Medium",
                "status": "Verified",
                "reported_by": users.get("tester.sarah"),
                "assigned_developer": users.get("dev.david"),
                "assigned_tester": users.get("tester.alex"),
                "fix_notes": "Preserved URL query parameters when generating page link buttons in pagination component.",
                "verification_notes": "Verified across Chrome, Safari, and mobile views. All filter parameters now persist seamlessly through pages 1 to 5.",
            }
        )

        # Bug 6: New Bug (Assignment upload failure)
        b6, _ = m.Bug.objects.update_or_create(
            title="PDF upload above 15MB silently fails with blank error modal",
            defaults={
                "project": p2,
                "page": pg_submission,
                "description": "Students attempting to upload large PDF portfolios over 15MB see a blank gray modal instead of file size limit warning.",
                "steps_to_reproduce": "1. Go to Assignment Submission\n2. Select 18MB PDF file\n3. Click 'Upload & Submit'\n4. Blank dialog appears with no message",
                "severity": "Minor",
                "priority": "Medium",
                "status": "New",
                "reported_by": users.get("tester.clara"),
                "assigned_developer": users.get("dev.elena"),
                "assigned_tester": users.get("tester.alex"),
            }
        )

        # Seed BugHistory entries
        m.BugHistory.objects.all().delete()
        for b in [b1, b2, b3, b4, b5, b6]:
            m.BugHistory.objects.create(
                bug=b,
                user=b.reported_by,
                action="Created",
                status_before="",
                status_after="New" if not b.assigned_developer else "Assigned",
                notes=f"Bug created by Tester {b.reported_by.username if b.reported_by else 'Tester'}."
            )

        # Specific history entries for b3 (Fixed)
        m.BugHistory.objects.create(
            bug=b3,
            user=b3.assigned_developer,
            action="In Progress",
            status_before="Assigned",
            status_after="In Progress",
            notes="Developer David Kim started investigating timer countdown trigger."
        )
        m.BugHistory.objects.create(
            bug=b3,
            user=b3.assigned_developer,
            action="Fixed",
            status_before="In Progress",
            status_after="Fixed",
            notes=f"Developer fixed the issue: {b3.fix_notes}"
        )

        # History entries for b4 (Reopened)
        m.BugHistory.objects.create(
            bug=b4,
            user=b4.assigned_developer,
            action="Fixed",
            status_before="In Progress",
            status_after="Fixed",
            notes="Developer Karthi marked bug as fixed."
        )
        m.BugHistory.objects.create(
            bug=b4,
            user=b4.assigned_tester,
            action="Reopened",
            status_before="Fixed",
            status_after="Reopened",
            notes=f"Tester Priya Patel REOPENED the defect: '{b4.reopen_reason}'"
        )

        # History entries for b5 (Verified)
        m.BugHistory.objects.create(
            bug=b5,
            user=b5.assigned_developer,
            action="Fixed",
            status_before="In Progress",
            status_after="Fixed",
            notes="Developer David Kim applied query param preservation fix."
        )
        m.BugHistory.objects.create(
            bug=b5,
            user=b5.assigned_tester,
            action="Verified",
            status_before="Fixed",
            status_after="Verified",
            notes=f"Tester Alex verified on staging. Result: {b5.verification_notes}"
        )

        self.stdout.write("[OK] Seeded 6 realistic bugs with complete audit trails and history.")
        self.stdout.write(self.style.SUCCESS("All seed data successfully loaded for Project, Pages, Bugs, and User Roles!"))
