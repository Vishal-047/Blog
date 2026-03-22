# Blogging Project

A full-stack blogging app built with `Node.js`, `Express`, `MongoDB`, and `EJS`.

## Features

- User signup/signin with JWT cookie auth
- Create, edit, and delete your own blogs
- Cover image upload with `multer`
- Comments on blog posts
- Homepage pagination (`?page=1`, `?page=2`, etc.)
- Input validation with clear error messages
- Security protections:
  - CSRF protection for all POST forms
  - Rate limiting for general and auth routes
- Automated tests for auth and blog flows

## Tech Stack

- Backend: `Node.js`, `Express`
- Database: `MongoDB Atlas` + `Mongoose`
- Templating: `EJS`
- Auth/Security: `jsonwebtoken`, `cookie-parser`, `csurf`, `express-rate-limit`
- Uploads: `multer`
- Testing: `jest`, `supertest`, `mongodb-memory-server`

## Environment Variables

Create `.env` in project root:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret_at_least_32_chars
PORT=8000
POSTS_PER_PAGE=6
```

Notes:
- `MONGO_URI` must be valid and authenticated for your Atlas DB user.
- URL-encode DB password special characters (`@`, `:`, `/`, `%`, `#`, etc.).
- `JWT_SECRET` is required for token signing and verification.

## Installation

```bash
npm install
```

## Run

Development:

```bash
npm run dev
```

Tests:

```bash
npm test
```

App URL:

```txt
http://localhost:8000
```

## Routes

Auth:
- `GET /user/signup`
- `POST /user/signup`
- `GET /user/signin`
- `POST /user/signin`
- `GET /user/logout`

Blog:
- `GET /` (paginated)
- `GET /myblogs`
- `GET /blog/createBlog`
- `POST /blog`
- `GET /blog/:id`
- `POST /blog/comment/:blogId`
- `GET /blog/edit/:id`
- `POST /blog/edit/:id`
- `POST /blog/delete/:id`

## Security Notes

- CSRF tokens are required on all state-changing form requests.
- Rate limiting is enabled:
  - General limiter for all routes
  - Stricter limiter for `/user/*` auth endpoints

## Deployment (Vercel)

Set these Environment Variables in Vercel project settings:

- `MONGO_URI`
- `JWT_SECRET`
- `POSTS_PER_PAGE` (optional)
- `PORT` (optional)

Then redeploy.

## MongoDB Atlas Checklist

- Create a DB user with read/write permissions
- Allow network access for deployment environment
- Ensure Vercel and local `.env` use the correct `MONGO_URI`
