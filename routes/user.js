const Router=require ('express');
const User=require('../model/user');
const router=Router();

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSignupInput(fullName, email, password) {
    if (!fullName || !email || !password) return "All fields are required";
    if (fullName.trim().length < 2) return "Full name must be at least 2 characters long";
    if (!isValidEmail(email)) return "Please enter a valid email address";
    if (password.length < 8) return "Password must be at least 8 characters long";
    return null;
}

router.get('/signin', (req,res)=>{
    return res.render("signin", { formData: {} });
});
router.get("/signup", (req,res)=>{
    return res.render("signup", { formData: {} });
});


router.post("/signin", async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
        return res.status(400).render("signin", {
            error: "Email and password are required",
            formData: { email },
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).render("signin", {
            error: "Please enter a valid email address",
            formData: { email },
        });
    }

    try {
        const token = await User.matchedPassword(email, password);
        return res.cookie("token", token).redirect("/");
    } catch (error) {
        return res.status(401).render("signin", {
            error: "Invalid email or password",
            formData: { email },
        });
    }
});

router.post('/signup',async (req,res)=>{
    try {
        const {fullName, email, password}=req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        const validationMessage = validateSignupInput(fullName, normalizedEmail, password);

        if (validationMessage) {
            return res.status(400).render("signup", {
                error: validationMessage,
                formData: {
                    fullName,
                    email: normalizedEmail,
                },
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).render("signup", {
                error: "User already exists. Try to login",
                formData: {
                    fullName,
                    email: normalizedEmail,
                },
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
            return res.status(409).render("signup",{
                error:"User already exists. Try to login",
                formData: {
                    fullName: req.body.fullName,
                    email: req.body.email?.trim().toLowerCase(),
                },
            })
        }

        return res.status(500).render("signup",{
            error:"Unable to create account right now. Please try again.",
            formData: {
                fullName: req.body.fullName,
                email: req.body.email?.trim().toLowerCase(),
            },
        })
    }
})

router.get('/logout', (req,res)=>{
    res.clearCookie('token').redirect("/");
})


module.exports=router;
