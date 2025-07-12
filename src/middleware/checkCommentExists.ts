import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import Comment from "../models/comment";

const checkCommentExists = async (req: Request, res: Response, next: NextFunction) => {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
        res.status(400).json({ message: "Comment id is not valid!" });
        return;
    }

    try {
        const comment = await Comment.exists({ _id: req.params.commentId });

        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
}

export default checkCommentExists;