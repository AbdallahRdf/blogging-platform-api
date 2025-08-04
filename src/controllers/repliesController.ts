import mongoose, { FilterQuery, ObjectId } from "mongoose";
import { matchedData, validationResult } from "express-validator";

import Comment from "../models/comment";
import Reply, { IReply } from "../models/reply";
import Post from "../models/post";
import Like from "../models/like";
import { Roles } from "../enums/user.enums";
import { NextFunction, Request, Response } from "express";
import { getErrorMessage } from "../utils/helpers";

export const getCommentReplies = async (req: Request, res: Response, next: NextFunction) => {
    let { limit, cursor } = req.query;
    const { postId, commentId } = req.params;

    // is the limit query param valid
    const parsedLimit = (Number(limit) + 1) || 21;

    // the find() query
    const query: FilterQuery<IReply> = { postId, commentId };
    if (cursor) {
        if (!mongoose.isValidObjectId(cursor)) {
            res.status(400).json({ message: "cursor is not valid" });
            return;
        }
        query._id = { $gte: cursor };
    }

    try {
        const replies = await Reply.find(query, { __v: false, commentId: false, postId: false, updatedAt: false })
            .sort({ _id: "ascending" }) // from the oldest reply to the newest
            .limit(parsedLimit)
            .populate("author", "username profileImage")
            .exec();

        const repliesLength = replies.length;

        // we will return a cursor pointing to the next comment, if we return 9 replies, we will send back the curosr of the 10th comment if there is one, or null if none.
        let nextCursor = null;

        if ((repliesLength && (repliesLength === parsedLimit))) {
            nextCursor = replies[repliesLength - 1]._id;
            replies.pop();
        }

        res.status(200).json({ cursor: nextCursor, replies });
    } catch (error) {
        next(error);
    }
}

export const createReply = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const errorMessage = {
            postId: getErrorMessage(errors, "postId"),
            commentId: getErrorMessage(errors, "commentId"),
            replyToUsername: getErrorMessage(errors, "replyToUsername"),
            body: getErrorMessage(errors, "body"),
        }
        res.status(400).json({ errors: errorMessage });
        return;
    }
    const { postId, commentId, replyToUsername, body } = matchedData<Omit<IReply, 'author' | 'likes'>>(req);

    let session = null;
    try {
        const post = await Post.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }

        const comment = await Comment.findOne({ _id: commentId, postId });
        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }

        const newReply = new Reply({
            postId,
            commentId,
            replyToUsername,
            author: req.user?.id,
            body,
        });
        post.comments++;
        comment.replies++;

        session = await mongoose.startSession();
        session.startTransaction();

        await newReply.save({ session });
        await post.save({ session });
        await comment.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ message: "Created" });
    } catch (error) {
        if (session !== null) {
            await session.abortTransaction();
            session.endSession();
        }
        next(error);
    }
}

export const updateReply = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const errorMessage = {
            postId: getErrorMessage(errors, "postId"),
            commentId: getErrorMessage(errors, "commentId"),
            replyId: getErrorMessage(errors, "replyId"),
            body: getErrorMessage(errors, "body"),
        }
        res.status(400).json({ errors: errorMessage });
        return;
    }

    const { postId, commentId, replyId, body } = matchedData<{ postId: ObjectId, commentId: ObjectId, replyId: ObjectId, body: string }>(req);
    try {
        const reply = await Reply.findOne({ _id: replyId, postId, commentId });
        if (!reply) {
            res.status(404).json({ message: "Comment reply not found" });
            return;
        }
        if (reply.author.toString() !== req.user?.id.toString()) {
            res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to update this comment.' });
            return;
        }
        reply.body = body;
        await reply.save();

        res.status(200).json({ message: "Updated" })
    } catch (error) {
        next(error);
    }
}

export const likeReply = async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.postId;
    const commentId = req.params.commentId;
    const replyId = req.params.replyId;

    if (!mongoose.isValidObjectId(replyId)) {
        res.status(400).json({ message: "Invalid comment reply id" });
        return;
    }

    let session = null;

    try {
        const reply = await Reply.findOne({ _id: replyId, postId, commentId });
        if (!reply) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }

        const likeDoc = await Like.findOne({ post: postId, user: req.user?.id, comment: replyId });
        // if the user is doing the same action (liking a post he already liked or the opposite)
        if (likeDoc) {
            res.status(200).json({ message: "Success" });
            return;
        }

        // Create a new like document
        const newLike = new Like({
            user: req.user?.id,
            post: postId,
            comment: replyId,
        });

        reply.likes++;

        session = await mongoose.startSession();
        session.startTransaction();

        await newLike.save({ session });
        await reply.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Success" });
    } catch (error) {
        if (session !== null) {
            await session.abortTransaction();
            session.endSession();
        }
        next(error);
    }
}

export const deleteCommentReply = async (req: Request, res: Response, next: NextFunction) => {
    const { postId, commentId, replyId } = req.params;
    if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json({ message: "Invalid post id" });
        return;
    }
    if (!mongoose.isValidObjectId(commentId)) {
        res.status(400).json({ message: "Invalid comment id" });
        return;
    }
    if (!mongoose.isValidObjectId(replyId)) {
        res.status(400).json({ message: "Invalid comment reply id" });
        return;
    }

    let session = null;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        const comment = await Comment.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }
        const reply = await Reply.findById(replyId);
        if (!reply) {
            res.status(404).json({ message: "reply not found" });
            return;
        }
        if (![Roles.ADMIN, Roles.MODERATOR].includes(req.user?.role as Roles) && (reply.author.toString() !== req.user?.id.toString())) {
            res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to create a post.' });
            return;
        }

        post.comments--;
        comment.replies--;

        session = await mongoose.startSession();
        session.startTransaction();

        await post.save({ session });
        await comment.save({ session });
        await reply.deleteOne({ session });
        await Like.deleteMany({ comment: replyId }, { session }); // delete the likes doc for the reply doc

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Deleted" });
    } catch (error) {
        if (session !== null) {
            await session.abortTransaction();
            session.endSession();
        }
        next(error);
    }
}

export const unlikeReply = async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.postId;
    const commentId = req.params.commentId;
    const replyId = req.params.replyId;

    if (!mongoose.isValidObjectId(replyId)) {
        res.status(400).json({ message: "Reply id is not valid!" });
        return;
    }

    let session = null;

    try {
        const reply = await Reply.findOne({ _id: replyId, postId, commentId });
        if (!reply) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }

        /*
            likeDoc: check if there is already a Like document for this reply by the authenticated user,
        */
        const likeDoc = await Like.findOne({ post: postId, user: req.user?.id, comment: replyId });
        // if the user is doing the same reaction (liking a post he already liked or the opposite)
        if (!likeDoc) {
            res.status(200).json({ message: "Success" });
            return;
        }

        session = await mongoose.startSession();
        session.startTransaction();

        likeDoc.deleteOne({ session });
        reply.likes--;
        await reply.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Success" });
    } catch (error) {
        if (session !== null) {
            await session.abortTransaction();
            session.endSession();
        }
        next(error);
    }
}