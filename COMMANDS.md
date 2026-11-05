# BugFlow - Commands & Login Credentials Cheat Sheet

---

## 🚀 1. One-Click Quick Run (Both Frontend & Backend)

Double-click or run from the root folder:
```cmd
run.bat
```
*(Or `.\run.ps1` in PowerShell)*

This automatically starts:
- **Backend (Django)** at [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Frontend (React/Vite)** at [http://localhost:5173](http://localhost:5173)

---

## 🔑 2. Default Login Accounts & Passwords

These accounts are seeded via `python manage.py seed_data`:

| Role | Username | Password | Email |
| :--- | :--- | :--- | :--- |
| **Tester** | `tester.priya` | `Tester123!` | priya@cliccot.io |
| **Tester** | `tester.alex` | `Tester123!` | alex@cliccot.io |
| **Tester** | `tester.sarah` | `Tester123!` | sarah@cliccot.io |
| **Tester** | `tester.clara` | `Tester123!` | clara@cliccot.io |
| **Developer** | `dev.karthi` | `Dev12345!` | karthi@cliccot.io |
| **Developer** | `dev.david` | `Dev12345!` | david@cliccot.io |
| **Developer** | `dev.elena` | `Dev12345!` | elena@cliccot.io |
| **Admin** | `admin` | `Admin123!` | admin@cliccot.io |
| **Super Admin** | `superadmin` | `Admin123!` | superadmin@cliccot.io |

---

## ⚙️ 3. Manual Run Commands

### 🐍 Backend (Django)
Open Terminal / CMD:
```cmd
cd backend
venv\Scripts\activate
python manage.py runserver
```

### ⚡ Frontend (React / Vite)
Open Terminal / CMD:
```cmd
cd frontend
npm run dev
```

---

## 🛠️ 4. Useful Management Commands

All run from the `backend/` directory with `venv` activated:

| Action | Command |
| :--- | :--- |
| **Apply DB Migrations** | `python manage.py migrate` |
| **Seed Realistic Data** | `python manage.py seed_data` |
| **Clear Data (Keep Users)** | `python manage.py clear_data` |
| **Clear Data + Users** | `python manage.py clear_data --delete-users` |
| **Create Custom Admin** | `python manage.py createsuperuser` |

---

## 🌐 5. Important URLs

- **Frontend App**: [http://localhost:5173/](http://localhost:5173/)
- **Backend API**: [http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/)
- **Django Admin Panel**: [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)
