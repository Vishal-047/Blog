const express = require("express");
const userRoute = require("./routes/user");
const mongoose = require("mongoose");
const path = require("path");
const cookieParser=require('cookie-parser');
const { CheckAuthCookie } = require("./middleware/auth");

const app = express();
const PORT = 8000;

mongoose.connect("mongodb://localhost:27017/blogging")
.then(()=>console.log("database connected"));

app.set("view engine","ejs");
app.set("views",path.resolve("./views"));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(CheckAuthCookie("token"));

app.get("/",(req,res)=>{
    res.render("home",{
        user:req.user,
    });
});

app.use("/user", userRoute);

app.listen(PORT, ()=> console.log(`Server started at ${PORT}`));