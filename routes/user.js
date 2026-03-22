const Router=require ('express');
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
        const normalizedEmail = email?.trim().toLowerCase();

        if (!fullName || !normalizedEmail || !password) {
            return res.render("signup", {
                error: "All fields are required"
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.render("signup", {
                error: "User already exists. Try to login"
            });
        }

        await User.create({
            fullName,
            email: normalizedEmail,
            password,
        });
        return res.redirect("signin");
    } catch (error) {
        console.error("Signup error:", error);

        if (error?.code === 11000) {
            return res.render("signup",{
                error:"User already exists. Try to login"
            })
        }

        return res.render("signup",{
            error:"Unable to create account right now. Please try again."
        })
    }
})

router.get('/logout', (req,res)=>{
    res.clearCookie('token').redirect("/");
})


module.exports=router;
