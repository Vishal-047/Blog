const { createHmac } = require('node:crypto');
const Router=require ('express');
const User=require('../model/user');
const { createToken } = require('../services/auth');
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

function requireAuth(req, res, next) {
    if (!req.user?._id) {
        return res.redirect('/user/signin');
    }
    return next();
}

function hashWithSalt(password, salt) {
    return createHmac('sha256', salt).update(password).digest('hex');
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

router.get('/settings', requireAuth, async (req, res) => {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
        res.clearCookie('token');
        return res.redirect('/user/signin');
    }

    return res.render('settings', {
        currentUser,
        success: req.query.success || '',
        formData: {
            fullName: currentUser.fullName,
        },
    });
});

router.post('/settings/profile', requireAuth, async (req, res) => {
    const fullName = (req.body.fullName || '').trim();

    if (fullName.length < 2) {
        const currentUser = await User.findById(req.user._id);
        return res.status(400).render('settings', {
            currentUser,
            error: 'Full name must be at least 2 characters long',
            success: '',
            formData: { fullName },
        });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
        res.clearCookie('token');
        return res.redirect('/user/signin');
    }

    currentUser.fullName = fullName;
    await currentUser.save();

    const refreshedToken = createToken(currentUser);
    return res.cookie('token', refreshedToken).redirect('/user/settings?success=profile-updated');
});

router.get('/change-password', requireAuth, (req, res) => {
    return res.render('changePassword', {
        success: req.query.success || '',
    });
});

router.post('/change-password', requireAuth, async (req, res) => {
    const currentPassword = req.body.currentPassword || '';
    const newPassword = req.body.newPassword || '';
    const confirmPassword = req.body.confirmPassword || '';

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).render('changePassword', {
            error: 'All password fields are required',
            success: '',
        });
    }
    if (newPassword.length < 8) {
        return res.status(400).render('changePassword', {
            error: 'New password must be at least 8 characters long',
            success: '',
        });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).render('changePassword', {
            error: 'New password and confirm password do not match',
            success: '',
        });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
        res.clearCookie('token');
        return res.redirect('/user/signin');
    }

    const hashedCurrent = hashWithSalt(currentPassword, currentUser.salt);
    if (hashedCurrent !== currentUser.password) {
        return res.status(401).render('changePassword', {
            error: 'Current password is incorrect',
            success: '',
        });
    }

    const hashedNew = hashWithSalt(newPassword, currentUser.salt);
    if (hashedNew === currentUser.password) {
        return res.status(400).render('changePassword', {
            error: 'New password must be different from current password',
            success: '',
        });
    }

    currentUser.password = newPassword;
    await currentUser.save();

    const refreshedToken = createToken(currentUser);
    return res.cookie('token', refreshedToken).redirect('/user/change-password?success=password-updated');
});

router.get('/logout', (req,res)=>{
    res.clearCookie('token').redirect("/");
})

module.exports=router;
