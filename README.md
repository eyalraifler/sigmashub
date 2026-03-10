# Sigmas Hub

A full-stack social networking platform built as a final school project. SigmaHub is an Instagram-like social network where users can share photos and videos, follow each other, like and comment on posts, and get AI-powered tag suggestions.

---

## Features

### User Accounts
- Sign up and login
- Secure login with bcrypt password hashing
- Edit profile: bio, avatar, privacy settings (public/private)
- Follow and unfollow other users
- View followers and following lists

### Posts
- Create posts with one or multiple images/videos
- Write captions for posts
- AI-powered tag suggestions via Google Gemini API
- Like and unlike posts
- Comment on posts

### Feed & Discovery
- Home feed showing posts from followed users and popular posts
- Search for users and content
- View user's profile and their posts


### Notifications
- Get notified when someone follows you
- Get notified when a user you follow posts something new
- Mark notifications as read

### Other
- Contact page

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | FastAPI (Python), Uvicorn |
| Database | MySQL with custom TCP socket DB server |
| Auth | Email verification, bcrypt |
| Email | Gmail SMTP |
| AI | Google Gemini API (tag suggestions) |

---

## Project Structure

```
sigmashub/
├── backend/
│   ├── main.py              # FastAPI app (all API endpoints)
│   ├── requirements.txt     # Python dependencies
│   ├── ai_services.py       # Gemini AI integration
│   ├── send_email.py        # Email utilities
│   ├── db_client.py         # Remote DB client (socket-based)
│   ├── db/
│   │   ├── db_server.py     # TCP socket DB server
│   │   ├── db_connection.py # MySQL connection wrapper
│   │   ├── models.py        # Data models
│   │   ├── schema.sql       # Database schema
│   │   └── init_db.py       # DB initialization script
│   └── uploads/             # Stored avatars and post media
│
└── frontend/
    └── app/
        ├── page.js          # Landing page
        ├── app/             # Main feed (authenticated)
        ├── login/           # Login page
        ├── signup/          # Signup page
        ├── contact_page/    # Contact form
        └── components/      # Reusable UI components
```

---

## How to Run

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL server running locally

---

### 1. Database Setup

Create a MySQL database named `sigmas_hub`, then initialize the schema:

```bash
cd backend/db
python init_db.py
```

---

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sigmas_hub
DB_SERVER_HOST=localhost
DB_SERVER_PORT=5000
EMAIL_PASSWORD=your_gmail_app_password
GENINI_API_KEY=your_gemini_api_key
```

Start the database socket server (in one terminal):

```bash
cd backend/db
python db_server.py
```

Start the FastAPI server (in another terminal):

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file inside `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables Summary

| File | Variable | Description |
|---|---|---|
| `backend/.env` | `DB_HOST` | MySQL host |
| `backend/.env` | `DB_PORT` | MySQL port (default 3306) |
| `backend/.env` | `DB_USER` | MySQL username |
| `backend/.env` | `DB_PASSWORD` | MySQL password |
| `backend/.env` | `DB_NAME` | Database name (`sigmas_hub`) |
| `backend/.env` | `DB_SERVER_HOST` | Socket DB server host |
| `backend/.env` | `DB_SERVER_PORT` | Socket DB server port (default 5000) |
| `backend/.env` | `EMAIL_PASSWORD` | Gmail app password for sending emails |
| `backend/.env` | `GENINI_API_KEY` | Google Gemini API key |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL` | URL of the FastAPI backend |
