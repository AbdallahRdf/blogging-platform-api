import mongoose from "mongoose";
import Post from "../models/post";
import { NextFunction, Request, Response } from "express";

const checkPostExists = async (req: Request, res: Response, next: NextFunction) => {
    if (!mongoose.isValidObjectId(req.params.postId)) {
        res.status(400).json({ message: "Post id is not valid!" });
        return;
    }

    try {
        const post = await Post.exists({ _id: req.params.postId });

        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
}

export default checkPostExists;