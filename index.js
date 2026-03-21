const express = require("express");
const userRoute = require("./routes/user");
const blogRoute = require("./routes/addBlog");
const mongoose = require("mongoose");
const path = require("path");
const cookieParser=require('cookie-parser');
const { CheckAuthCookie } = require("./middleware/auth");
const blog = require("./model/blog");

const app = express();
const PORT = 8000;

mongoose.connect("mongodb://localhost:27017/blogging")
.then(()=>console.log("database connected"));

app.set("view engine","ejs");
app.set("views",path.resolve("./views"));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(CheckAuthCookie("token"));
app.use(express.static(path.resolve("./public")));

app.get("/",async (req,res)=>{
    const allBlogs=await blog.find({});
    res.render("home",{
        user:req.user,
        blog:allBlogs,
    });
});

app.use("/user", userRoute);
app.use("/blog", blogRoute);

app.listen(PORT, ()=> console.log(`Server started at ${PORT}`));