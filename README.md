# BugFlow - Simple Bug Management System

A focused, simple, and intuitive bug management system built with **React (Vite)** + **Django REST Framework** + **PostgreSQL/SQLite** + **JWT Authentication**.

---

## 🎯 4 Core Modules

1. **📁 Projects** – Create and manage projects.
2. **📄 Pages** – Create and manage application pages under each project.
3. **🐛 Bugs** – Testers create bugs and assign them to developers. Complete resolution lifecycle with Developer fixing, Tester verification, and Reopen workflows.
4. **👥 User Roles** – Focused roles: **Tester**, **Developer**, and **Admin**.

> [!NOTE]
> All unnecessary complexity (Test Cases, Test Suites, Test Cycles, and Exceptions) has been completely removed to keep the workflow clean, fast, and simple.

---

## 🚀 Quick Start (One-Click Launch)

Double-click or run from the root folder:
```cmd
run.bat
```
*(Or `.\run.ps1` in PowerShell)*

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/)
- **Django Admin**: [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

---

## 🔑 Default User Accounts & Passwords

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Tester** | `tester.priya` | `Tester123!` | Create bugs, assign developers, verify fixes, reopen if issue persists |
| **Tester** | `tester.alex` | `Tester123!` | Create bugs, verify fixes on pages |
| **Developer** | `dev.karthi` | `Dev12345!` | View assigned bugs, start progress, submit fixes |
| **Developer** | `dev.david` | `Dev12345!` | View assigned bugs, submit fix notes & code changes |
| **Admin** | `admin` | `Admin123!` | Full administration and user management |
| **Super Admin** | `superadmin` | `Admin123!` | Django superuser |

---

## 🔄 Bug Resolution & Reopen Workflow

1. **Tester creates Bug**:
   - Selects Project and Page.
   - Enters title, description, steps to reproduce, severity, priority.
   - Assigns a Developer to fix and an optional Tester to verify.
2. **Developer fixes Bug**:
   - Views assigned bugs (filtered under *"My Assigned Bugs"* or status *"Assigned"* / *"In Progress"*).
   - Clicks **Start Working** (sets status to `In Progress`).
   - Clicks **Submit Fix** (inputs fix notes, root cause, code changes; status becomes `Fixed`).
3. **Tester verifies Bug**:
   - Views fixed bugs in the **Tester Verification Queue**.
   - Tests the fix on the specified page.
   - **If resolved**: Clicks **Confirm Resolved** (status becomes `Verified` or `Closed`).
   - **If not resolved properly**: Clicks **Reopen Bug**, inputs reopen reason, and reassigns to developer (status becomes `Reopened`, increments `reopen_count`).
4. **Audit History**:
   - Every action (Creation, In Progress, Fix details, Reopen reasons, Verification sign-offs) is permanently recorded in an audit timeline.
