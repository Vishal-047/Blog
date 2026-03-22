# Blogging Project

A full-stack blogging application built with `Node.js`, `Express`, `MongoDB`, and `EJS`.

## Features

- User signup and signin (JWT cookie based auth)
- Create, edit, and delete your own blogs
- Upload blog cover images with `multer`
- View all blogs on homepage
- View only your blogs on `/myblogs`
- Add comments on blog posts
- Protected actions for authenticated users

## Tech Stack

- Backend: `Node.js`, `Express`
- Database: `MongoDB Atlas` with `Mongoose`
- Templating: `EJS`
- Auth: `jsonwebtoken`, `cookie-parser`
- File Uploads: `multer`

## Project Structure

```txt
blogging/
  middleware/
    auth.js
  model/
    blog.js
    comment.js
    user.js
  public/
    uploads/
  routes/
    addBlog.js
    user.js
  services/
    auth.js
  views/
  index.js
```

## Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URI=your_mongodb_connection_string
PORT=8000
```

Notes:
- `MONGO_URI` must be a valid MongoDB URI.
- If your DB password has special characters, URL-encode them.

## Installation

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Server starts on:

```txt
http://localhost:8000
```

## Main Routes

### Auth Routes

- `GET /user/signup` -> Signup page
- `POST /user/signup` -> Create new account
- `GET /user/signin` -> Signin page
- `POST /user/signin` -> Login
- `GET /user/logout` -> Logout user

### Blog Routes

- `GET /` -> Home page (all blogs)
- `GET /myblogs` -> Blogs created by logged-in user
- `GET /blog/createBlog` -> Blog creation page
- `POST /blog/` -> Create blog (with cover image)
- `GET /blog/:id` -> View single blog
- `POST /blog/comment/:blogId` -> Add comment
- `GET /blog/edit/:id` -> Edit blog page (owner only)
- `POST /blog/edit/:id` -> Update blog (owner only)
- `POST /blog/delete/:id` -> Delete blog (owner only)

## MongoDB Atlas Checklist

- Create database user with read/write permissions
- Add your IP in Network Access (or allow all for deployment)
- Set the same `MONGO_URI` in local `.env` and deployment provider env settings

## Deployment (Vercel)

Set environment variables in Vercel Project Settings:

- `MONGO_URI`
- `PORT` (optional)

Then redeploy the project.

## Future Improvements

- Move JWT secret from code to `.env` (`JWT_SECRET`)
- Add input validation with clear error messages
- Add pagination for homepage blogs
- Add tests for auth and blog routes
- Add rate limiting and CSRF protection
