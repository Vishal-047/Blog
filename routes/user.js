const Router=require ('express');
const model=require('mongoose');
const User=require('../model/user');
const router=Router();

router.get('/signin', (req,res)=>{
    return res.render("signin");
});
router.get("/signup", (req,res)=>{
    return res.render("signup");
});


router.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    try {
        const token = await User.matchedPassword(email, password);
        return res.cookie("token", token).redirect("/");
    } catch (error) {
        return res.render("signin", {
            error: "Invalid email or password",
        });
    }
});

router.post('/signup',async (req,res)=>{
    try {
        const {fullName, email, password}=req.body;
        await User.create({
            fullName,
            email,
            password,
        });
        return res.redirect("signin");
    } catch (error) {
        return res.render("signup",{
            error:"User already Exists. Try to Login"
        })
    }
})

router.get('/logout', (req,res)=>{
    res.clearCookie('token').redirect("/");
})


module.exports=router;