import mongoose from "mongoose";
import Post from "../mongoose/schemas/post.js";

const checkPostExists = async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.postId)) return res.status(400).json({ message: "Post id is not valid!" });
    
    try {
        const post = await Post.findById(req.params.postId);
        
        if(!post) return res.status(404).json({ message: "Post not found" });

        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export default checkPostExists;