# 🗳️ VoteApp — Full-Stack Voting Application

A complete, production-ready voting application built with Django + DRF (backend) and React + TypeScript + Tailwind (frontend).

---

## Features

- **JWT Authentication** with role-based access (User / Admin)
- **One vote per user per election** enforced at DB and application level
- **Active election detection** with time-window validation
- **Admin dashboard**: view real-time results with bar charts and breakdowns
- **Admin management**: create elections, toggle active status, add candidates
- **Fully responsive UI** with loading states and clear error messages

---

## Tech Stack

| Layer     | Technology                                              |
|-----------|---------------------------------------------------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts |
| Backend   | Django 4.2, Django REST Framework, SimpleJWT            |
| Database  | PostgreSQL                                              |
| Auth      | JWT (access + refresh tokens)                           |

---

## Project Structure

```
voting-app/
├── docker-compose.yml
├── voting_backend/          # Django project
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── voting_backend/      # Project settings & URLs
│   │   ├── settings.py
│   │   └── urls.py
│   └── elections/           # Main app
│       ├── models.py        # CustomUser, Election, Candidate, Vote
│       ├── serializers.py
│       ├── views.py
│       ├── permissions.py
│       ├── urls.py
│       ├── admin.py
│       └── tests.py
└── voting-frontend/         # React app
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── Dockerfile
    └── src/
        ├── api/             # client.ts, auth.ts, elections.ts
        ├── context/         # AuthContext.tsx
        ├── components/      # Navbar, ProtectedRoute, CandidateCard
        └── routes/          # LoginPage, CandidateListPage, AdminResultsPage, AdminManagePage
```

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (or Docker)

### Backend Setup

```bash
cd voting_backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your DB credentials

# Run migrations
python manage.py migrate

# Create a superuser / admin
python manage.py createsuperuser

# Promote user to ADMIN role via Django shell:
python manage.py shell
>>> from elections.models import CustomUser
>>> u = CustomUser.objects.get(username='your_username')
>>> u.role = 'ADMIN'
>>> u.save()

# Start the server
python manage.py runserver
```

### Frontend Setup

```bash
cd voting-frontend

npm install
npm run dev
```

The app will be available at **http://localhost:5173** (Vite proxies `/api` to Django on port 8000).

---

## Docker Compose (Recommended)

```bash
# Start all services
docker-compose up --build

# In a separate terminal, run migrations and create admin user
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser

# Promote user to ADMIN
docker-compose exec backend python manage.py shell -c "
from elections.models import CustomUser
u = CustomUser.objects.get(username='admin')
u.role = 'ADMIN'
u.save()
print('Done')
"
```

Visit **http://localhost** for the app, **http://localhost:8000/admin** for the Django admin panel.

---

## API Endpoints

### Auth
| Method | Endpoint             | Description              |
|--------|----------------------|--------------------------|
| POST   | `/api/auth/login/`   | Login, returns JWT tokens |
| POST   | `/api/auth/refresh/` | Refresh access token     |
| GET    | `/api/me/`           | Get current user info    |

### Voting (authenticated users)
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/api/elections/active/`              | Get active election      |
| GET    | `/api/elections/<id>/candidates/`     | List candidates          |
| POST   | `/api/elections/<id>/vote/`           | Cast a vote              |

### Admin (ADMIN role only)
| Method | Endpoint                                  | Description              |
|--------|-------------------------------------------|--------------------------|
| GET    | `/api/admin/elections/`                   | List all elections       |
| POST   | `/api/admin/elections/`                   | Create election          |
| PATCH  | `/api/admin/elections/<id>/`              | Update election          |
| GET    | `/api/admin/elections/<id>/results/`      | View vote results        |
| POST   | `/api/admin/candidates/`                  | Create candidate         |

---

## Running Tests (Backend)

```bash
cd voting_backend
python manage.py test elections
```

Tests cover:
- Login success and failure
- Authenticated user can vote once
- Duplicate vote returns 409
- Inactive election blocks voting
- Non-admin cannot access results
- Admin can access results and vote counts

---

## User Flows

### Normal User
1. Visit `/login` → Sign in
2. View the active election and candidates at `/vote`
3. Click **Vote** on a candidate
4. See confirmation; vote button is disabled for future visits

### Admin
1. Visit `/login` → Sign in
2. Go to `/admin/manage` to create elections and candidates
3. Go to `/admin/results` to view real-time bar chart and breakdown

---

## Environment Variables (Backend)

| Variable      | Default       | Description                  |
|---------------|---------------|------------------------------|
| `SECRET_KEY`  | insecure dev  | Django secret key            |
| `DEBUG`       | `True`        | Debug mode                   |
| `DB_NAME`     | `voting_db`   | PostgreSQL database name     |
| `DB_USER`     | `postgres`    | Database user                |
| `DB_PASSWORD` | `postgres`    | Database password            |
| `DB_HOST`     | `localhost`   | Database host                |
| `DB_PORT`     | `5432`        | Database port                |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Allowed hosts       |
