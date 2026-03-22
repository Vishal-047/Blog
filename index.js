require('dotenv').config({ quiet: true });
const express = require("express");
const userRoute = require("./routes/user");
const blogRoute = require("./routes/addBlog");
const mongoose = require("mongoose");
const path = require("path");
const cookieParser=require('cookie-parser');
const { CheckAuthCookie } = require("./middleware/auth");
const blog = require("./model/blog");

const app = express();
const PORT = process.env.PORT || 8000;


mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("database connected");

    app.listen(PORT, () => {
        console.log(`Server started at ${PORT}`);
    });
})
.catch(err => console.log(err));

app.set("view engine","ejs");
app.set("views",path.resolve("./views"));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(CheckAuthCookie("token"));

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
    const allBlogs=await blog.find({}).populate("createdBy");
    res.render("home",{
        user:req.user,
        blog:allBlogs,
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