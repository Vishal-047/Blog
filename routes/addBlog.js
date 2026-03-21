const Router=require ('express');
const multer=require('multer');
const path=require('path');
const mongoose = require('mongoose');
const blog = require('../model/blog');
const router=Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve('./public/uploads'))
  },
  filename: function (req, file, cb) {
    const fileName=`${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  }
})

const upload = multer({ storage: storage })

router.get('/createBlog', (req,res)=>{
    return res.render("addBlogs",{
        user:req.user,
    });
})

router.get("/:id", async (req,res)=>{
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send('Invalid blog id');
    }
    try {
        const foundBlog = await blog.findById(id);
        if (!foundBlog) {
            return res.status(404).send('Blog not found');
        }
        return res.render("Blogs",{
            user:req.user,
            blog: foundBlog,
        });
    } catch (error) {
        return res.status(500).send('Failed to fetch blog');
    }
})

router.post('/', upload.single('coverImage'), async (req,res)=>{
    const {title,body}=req.body;
    if (!req.file) {
        return res.status(400).send('Cover image file is required');
    }
    await blog.create({
        body,
        title,
        createdBy: req.user._id,
        coverImage: req.file.filename
    });
    return res.redirect('/');
})

module.exports = router;
