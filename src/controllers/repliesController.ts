import mongoose, { FilterQuery, ObjectId } from "mongoose";
import { matchedData, validationResult } from "express-validator";

import Comment from "../models/comment";
import Reply, { IReply } from "../models/reply";
import Post from "../models/post";
import Like from "../models/like";
import { Roles } from "../enums/user.enums";
import { NextFunction, Request, Response } from "express";

export const getCommentReplies = async (req: Request, res: Response, next: NextFunction) => {
    let { limit, cursor } = req.query;
    const { postId, commentId } = req.params;

    // is the limit query param valid
    const parsedLimit = (Number(limit) + 1) || 20;

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
        const replies = await Reply.find(query, { __v: false, commentId: false })
            .sort({ _id: "ascending" }) // from the oldest reply to the newest
            .limit(parsedLimit)
            .populate("owner", "username profileImage")
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
        res.status(400).json({ errors: result.array() });
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

        const response: { message: string, accessToken?: string } = { message: 'comment reply was created successfuly' }
        if (req.newAccessToken) {
            response.accessToken = req.newAccessToken;
        }
        res.status(201).json(response);
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
        res.status(400).json({ errors: result.array() });
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

        if (req.newAccessToken) {
            res.status(200).json({ accessToken: req.newAccessToken });
            return;
        }
        res.sendStatus(204);
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
            res.status(200).json({ message: 'Already liked' });
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

        if (req.newAccessToken) {
            res.status(200).json({ accessToken: req.newAccessToken });
            return;
        }
        res.sendStatus(204);
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
        if ([Roles.ADMIN, Roles.MODERATOR].includes(req.user?.role as Roles) && (reply.author.toString() !== req.user?.id.toString())) {
            res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to create a post.' });
            return;
        }

        post.comments--;
        comment.replies--;

        session = await mongoose.startSession();
        session.startTransaction();

        await post.save({ session });
        await comment.save({ session });
        await reply.deleteOne().session(session);
        await Like.deleteMany({ comment: replyId }).session(session); // delete the likes doc for the reply doc

        await session.commitTransaction();
        session.endSession();

        if (req.newAccessToken) {
            res.status(200).json({ accessToken: req.newAccessToken });
            return;
        }
        res.sendStatus(204);
    } catch (error) {
        if (session !== null) {
            await session.abortTransaction();
            session.endSession();
        }
        next(error);
    }
}