# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/c59fbbe4-9119-45e3-9010-0018c0c66b29

## Local Development

### Frontend (Vite + React)

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` by default. Configure the API base by copying `env.example` to `.env` and setting `VITE_API_URL`.

### Backend (Express + MySQL)

```bash
cd server
npm install
cp env.example .env
npm run dev
```

The API listens on `http://localhost:4000` by default and exposes `POST /auth/login` plus `/health`.

### Database

1. Create a local MySQL instance.
2. Run the SQL in `server/seed.sql` to create the `hrm` database and seed the default admin (`admin` / `admin123`).
3. Update `server/.env` with your DB credentials if they differ.

> The login endpoint accepts either username, email, or employee ID along with the password. Passwords can be stored hashed with bcrypt or in plain text for local prototyping.

## Other ways to edit

- **Lovable:** visit the [Lovable Project](https://lovable.dev/projects/c59fbbe4-9119-45e3-9010-0018c0c66b29) and start prompting. Changes sync back here.
- **GitHub UI:** open a file, click the pencil icon, edit, and commit.
- **Codespaces:** open the repo, click “Code” → “Codespaces” → “New codespace”, make changes, then commit/push.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c59fbbe4-9119-45e3-9010-0018c0c66b29) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
