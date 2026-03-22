const Router=require ('express');
const multer=require('multer');
const path=require('path');
const mongoose = require('mongoose');
const blog = require('../model/blog');
const comment = require('../model/comment');
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

router.get('/createBlog', async (req,res)=>{
    let userBlogs = [];
    if(req.user){
        userBlogs = await blog.find({createdBy:req.user._id}).populate("createdBy");
    }
    return res.render("addBlogs",{
        user:req.user,
        userBlogs: userBlogs,
    });
})

router.get("/:id", async (req,res)=>{
    const { id } = req.params;
    const comments=await comment.find({blogId:id}).populate("createdBy");
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send('Invalid blog id');
    }
    try {
        const foundBlog = await blog.findById(id).populate("createdBy");
        if (!foundBlog) {
            return res.status(404).send('Blog not found');
        }
        let userBlogs = [];
        if(req.user){
            userBlogs = await blog.find({createdBy:req.user._id}).populate("createdBy");
        }
        return res.render("Blogs",{
            user:req.user,
            blog: foundBlog,
            comments,
            userBlogs: userBlogs,
        });
    } catch (error) {
        return res.status(500).send('Failed to fetch blog');
    }
})

router.post('/comment/:blogId', async(req,res)=>{
    const { blogId } = req.params;
    const content = (req.body.content || '').trim();

    if (!req.user) {
        return res.status(401).send('Please sign in to comment');
    }
    if (!mongoose.Types.ObjectId.isValid(blogId)) {
        return res.status(400).send('Invalid blog id');
    }
    if (!content) {
        return res.status(400).send('Comment content is required');
    }

    try {
        await comment.create({
            content,
            blogId,
            createdBy: req.user._id,
        });
        return res.redirect(`/blog/${blogId}`);
    } catch (error) {
        return res.status(500).send('Failed to add comment');
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

router.get('/edit/:id', async (req,res)=>{
    if(!req.user) {
        return res.status(401).send('Please sign in to edit a blog');
    }
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send('Invalid blog id');
    }
    try {
        const foundBlog = await blog.findById(id);
        if (!foundBlog) {
            return res.status(404).send('Blog not found');
        }
        if (foundBlog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).send('You are not authorized to edit this blog');
        }
        const userBlogs = await blog.find({createdBy:req.user._id}).populate("createdBy");
        return res.render('editBlog', {
            user: req.user,
            blog: foundBlog,
            userBlogs: userBlogs,
        });
    } catch (error) {
        return res.status(500).send('Failed to fetch blog');
    }
})

router.post('/edit/:id', upload.single('coverImage'), async (req,res)=>{
    if(!req.user) {
        return res.status(401).send('Please sign in to edit a blog');
    }
    const { id } = req.params;
    const {title, body} = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send('Invalid blog id');
    }
    
    try {
        const foundBlog = await blog.findById(id);
        if (!foundBlog) {
            return res.status(404).send('Blog not found');
        }
        if (foundBlog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).send('You are not authorized to edit this blog');
        }
        
        foundBlog.title = title || foundBlog.title;
        foundBlog.body = body || foundBlog.body;
        if (req.file) {
            foundBlog.coverImage = req.file.filename;
        }
        
        await foundBlog.save();
        return res.redirect(`/blog/${id}`);
    } catch (error) {
        return res.status(500).send('Failed to update blog');
    }
})

router.post('/delete/:id', async (req,res)=>{
    if(!req.user) {
        return res.status(401).send('Please sign in to delete a blog');
    }
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send('Invalid blog id');
    }
    try {
        const foundBlog = await blog.findById(id);
        if (!foundBlog) {
            return res.status(404).send('Blog not found');
        }
        if (foundBlog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).send('You are not authorized to delete this blog');
        }
        
        await comment.deleteMany({blogId: id});
        await blog.findByIdAndDelete(id);
        return res.redirect('/myblogs');
    } catch (error) {
        return res.status(500).send('Failed to delete blog');
    }
})

module.exports = router;
