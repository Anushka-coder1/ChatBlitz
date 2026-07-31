# ChatBlitz

ChatBlitz is a full-stack real-time chat application built with React, Vite, Tailwind CSS, Node.js, Express, MongoDB, and Socket.IO. It supports JWT-based authentication, direct and group chats, realtime presence and typing, message delivery states, file uploads, notifications, and responsive chat workflows.

## Features

- Email/password authentication with JWT and secure cookies
- User profiles with avatar, bio, username, online status, and last seen
- One-to-one conversations and group chat management
- Realtime message delivery, typing indicators, notifications, and presence updates
- Attachment uploads for images, video, audio, PDFs, and documents through Cloudinary
- Notification center with unread counters
- Responsive chat layout with dark/light themes
- Paginated chat and message fetching

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Zustand, Socket.IO Client
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT, Bcrypt, Multer, Cloudinary

## Project Structure

```text
backend/
  config/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
frontend/
  src/
    pages/
    services/
    store/
```

## Setup

1. Install root dependencies:

   ```bash
   npm install
   ```

2. Install frontend dependencies:

   ```bash
   npm install --prefix frontend
   ```

3. Copy `.env.example` to `.env` and fill in your MongoDB and Cloudinary credentials.

4. Start the app in development mode:

   ```bash
   npm run dev
   ```

5. Open the frontend at [http://localhost:5173](http://localhost:5173).

## Scripts

- `npm run dev` starts backend and frontend together
- `npm run server` starts the backend API
- `npm run client` starts the frontend
- `npm run build` builds the frontend for production
- `npm start` runs the backend in production mode

## Production Notes

- Use a strong `JWT_SECRET`
- Set `FRONTEND_URL` to your deployed frontend origin
- Configure Cloudinary credentials before uploading files
- Rotate any credentials that were previously committed to source control
