import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import Reply from "../models/reply";

const checkReplyExists = async (req: Request, res: Response, next: NextFunction) => {
    if (!mongoose.isValidObjectId(req.params.replyId)) {
        res.status(400).json({ message: "Reply id is not valid!" });
        return;
    }

    try {
        const reply = await Reply.exists({ _id: req.params.replyId });

        if (!reply) {
            res.status(404).json({ message: "Reply not found" });
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
}

export default checkReplyExists;