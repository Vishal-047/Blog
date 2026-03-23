require('dotenv').config({ quiet: true });
const express = require("express");
const userRoute = require("./routes/user");
const blogRoute = require("./routes/addBlog");
const mongoose = require("mongoose");
const path = require("path");
const cookieParser = require('cookie-parser');
const { CheckAuthCookie } = require("./middleware/auth");
const blog = require("./model/blog");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 8000;
const POSTS_PER_PAGE = Number(process.env.POSTS_PER_PAGE || 8);
let connectionPromise = null;

// Vercel sits behind a proxy and forwards client IP in X-Forwarded-For.
// Trust one hop so express-rate-limit can identify real users correctly.
app.set("trust proxy", 1);

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

// In serverless runtimes (like Vercel), ensure DB is connected per request.
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    return next();
  } catch (err) {
    console.error("Database connection error:", err);
    return res.status(500).send("Database unavailable. Please try again.");
  }
});

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
    // Basic pagination: page starts at 1, skip = (page-1)*limit.
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

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI)
      .then(() => mongoose.connection)
      .catch((err) => {
        connectionPromise = null;
        throw err;
      });
  }

  return connectionPromise;
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


module.exports = app;
module.exports.app = app;
module.exports.startServer = startServer;
module.exports.connectToDatabase = connectToDatabase;
