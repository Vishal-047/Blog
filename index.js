require('dotenv').config({ quiet: true });
const express = require("express");
const userRoute = require("./routes/user");
const blogRoute = require("./routes/addBlog");
const mongoose = require("mongoose");
const path = require("path");
const cookieParser = require('cookie-parser');
const { CheckAuthCookie } = require("./middleware/auth");
const blog = require("./model/blog");
const csrf = require("csurf");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 8000;
const POSTS_PER_PAGE = Number(process.env.POSTS_PER_PAGE || 6);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests. Please try again in a few minutes.",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts. Please wait and try again.",
});

app.set("view engine","ejs");
app.set("views",path.resolve("./views"));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(generalLimiter);
app.use("/user", authLimiter);
app.use(CheckAuthCookie("token"));

if (process.env.DISABLE_CSRF !== "true") {
  app.use(
    csrf({
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  });
} else {
  app.use((req, res, next) => {
    res.locals.csrfToken = "";
    next();
  });
}

// Global middleware to expose user blogs into navbar on all pages
app.use(async (req, res, next) => {
  res.locals.user = req.user;
  if (req.user && req.user._id) {
    try {
      const userBlogs = await blog.find({ createdBy: req.user._id }).populate("createdBy");
      res.locals.userBlogs = userBlogs;
    } catch (err) {
      res.locals.userBlogs = [];
    }
  } else {
    res.locals.userBlogs = [];
  }
  next();
});

app.use(express.static(path.resolve("./public")));

app.get("/",async (req,res)=>{
    const currentPage = Math.max(1, Number(req.query.page) || 1);
    const skip = (currentPage - 1) * POSTS_PER_PAGE;

    const [totalBlogs, allBlogs] = await Promise.all([
      blog.countDocuments({}),
      blog.find({}).sort({ createdAt: -1 }).skip(skip).limit(POSTS_PER_PAGE).populate("createdBy"),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalBlogs / POSTS_PER_PAGE));

    res.render("home",{
        user:req.user,
        blog:allBlogs,
        pagination: {
          currentPage,
          totalPages,
          totalBlogs,
        },
    });
});

app.get("/myblogs", async (req, res) => {
  if (!req.user) {
    return res.redirect('/user/signin');
  }
  const userBlogs = await blog.find({ createdBy: req.user._id }).populate('createdBy');
  res.render('myBlogs', {
    user: req.user,
    userBlogs,
  });
});

app.use("/user", userRoute);
app.use("/blog", blogRoute);

app.use((err, req, res, next) => {
  if (err && err.code === "EBADCSRFTOKEN") {
    return res.status(403).render("signin", {
      error: "Session expired or invalid form token. Please refresh and try again.",
    });
  }
  return next(err);
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  return res.status(500).send("Internal server error");
});

async function connectToDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set. Add it to your environment variables.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(process.env.MONGO_URI);
  return mongoose.connection;
}

async function startServer() {
  await connectToDatabase();
  console.log("database connected");

  return app.listen(PORT, () => {
    console.log(`Server started at ${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { app, startServer, connectToDatabase };
