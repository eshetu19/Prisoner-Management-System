# Prisoner Education and Rehabilitation Management System

## Setup
1. Install Node.js and MySQL.
2. Run `npm install` from the project root.
3. Copy `backend/.env.example` to `backend/.env` and set local credentials and a strong `SESSION_SECRET`.
4. Create/import the database using `database/database.sql`.
5. Start with `npm run dev` (or `npm start`).

The Express backend serves the static frontend from `frontend/` and uploaded files from `backend/uploads/`.

## Notes
- Keep `backend/.env` private and never commit it.
- Existing route handlers are separated by resource in `backend/routes/`; controller extraction can be done incrementally after confirming the refactored app works.
- Verify database access and core workflows (login, role access, prisoner CRUD, programs, enrollments, staff and sessions) after setup.
