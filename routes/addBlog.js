const Router=require ('express');
const multer=require('multer');
const mongoose = require('mongoose');
const blog = require('../model/blog');
const comment = require('../model/comment');
const router=Router();

function validateBlogInput(title, body) {
    const cleanedTitle = (title || "").trim();
    const cleanedBody = (body || "").trim();

    
    if (!cleanedTitle || !cleanedBody) {
        return "Title and content are required";
    }
    if (cleanedTitle.length < 3) {
        return "Title must be at least 3 characters long";
    }
    if (cleanedTitle.length > 120) {
        return "Title cannot exceed 120 characters";
    }
    return null;
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

router.get('/cover/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send('Invalid blog id');
    }

    try {
        const foundBlog = await blog.findById(id).select('coverImageData coverImageContentType coverImage');
        if (!foundBlog) {
            return res.status(404).send('Blog not found');
        }

        if (foundBlog.coverImageData) {
            if (foundBlog.coverImageContentType) {
                res.set('Content-Type', foundBlog.coverImageContentType);
            }
            return res.send(foundBlog.coverImageData);
        }

        return res.status(404).send('Cover image not found');
    } catch (error) {
        return res.status(500).send('Failed to fetch cover image');
    }
});

router.get('/createBlog', async (req,res)=>{
    if (!req.user) {
        return res.redirect('/user/signin');
    }

    let userBlogs = [];
    userBlogs = await blog.find({createdBy:req.user._id}).populate("createdBy");

    return res.render("addBlogs",{
        user:req.user,
        userBlogs: userBlogs,
        formData: {},
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
    if (content.length > 500) {
        return res.status(400).send('Comment cannot exceed 500 characters');
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
    if (!req.user) {
        return res.status(401).send('Please sign in to create a blog');
    }

    const { title, body } = req.body;
    const validationMessage = validateBlogInput(title, body);
    const userBlogs = await blog.find({createdBy:req.user._id}).populate("createdBy");

    if (validationMessage) {
        return res.status(400).render("addBlogs", {
            user: req.user,
            userBlogs,
            error: validationMessage,
            formData: { title: (title || "").trim(), body: (body || "").trim() },
        });
    }

    if (!req.file) {
        return res.status(400).render("addBlogs", {
            user: req.user,
            userBlogs,
            error: "Cover image file is required",
            formData: { title: (title || "").trim(), body: (body || "").trim() },
        });
    }
    const createdBlog = await blog.create({
        body: body.trim(),
        title: title.trim(),
        createdBy: req.user._id,
        coverImageData: req.file.buffer,
        coverImageContentType: req.file.mimetype,
    });
    createdBlog.coverImage = `/blog/cover/${createdBlog._id}`;
    await createdBlog.save();
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

        const validationMessage = validateBlogInput(title, body);
        if (validationMessage) {
            const userBlogs = await blog.find({createdBy:req.user._id}).populate("createdBy");
            return res.status(400).render("editBlog", {
                user: req.user,
                blog: foundBlog,
                userBlogs,
                error: validationMessage,
            });
        }
        
        foundBlog.title = title.trim();
        foundBlog.body = body.trim();
        if (req.file) {
            foundBlog.coverImageData = req.file.buffer;
            foundBlog.coverImageContentType = req.file.mimetype;
            foundBlog.coverImage = `/blog/cover/${id}`;
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
            // Ownership check, prevents deleting someone else's post.
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
