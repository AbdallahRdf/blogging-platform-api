import { NextFunction, Request, Response } from "express";
import mongoose, { FilterQuery, ObjectId, SortOrder } from "mongoose";
import Post from "../models/post";
import User from "../models/user";
import Comment from "../models/comment"
import Reply from "../models/reply"
import Like from "../models/like";
import { matchedData, validationResult } from "express-validator";
import { Roles } from "../enums/user.enums";
import { Sort } from "../enums/post.enums";
import { IComment } from "../models/comment";
import { getErrorMessage } from "../utils/helpers";

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
    let { limit, cursor, sort = Sort.TOP } = req.query;

    const parsedLimit = (Number(limit) + 1) || 21;

    // the sort query
    let sortQuery: Record<string, SortOrder> = {};
    switch (sort) {
        case Sort.LATEST: sortQuery._id = -1; break;
        case Sort.OLDEST: sortQuery._id = 1; break;
        case Sort.TOP: sortQuery.likes = -1; sortQuery._id = -1; break
    }

    // the find() query
    const query: FilterQuery<IComment> = { postId: req.params.postId };
    if (cursor) {
        switch (sort) {
            case (Sort.LATEST):
                query._id = { $lte: cursor };
                break;
            case (Sort.OLDEST):
                query._id = { $gte: cursor };
                break;
            case (Sort.TOP):
                const lastComment = await Comment.findById(cursor);
                if (!lastComment) {
                    res.status(400).json({ message: "Cursor does not exist" });
                    return;
                }
                query.$or = [
                    { likes: { $lt: lastComment.likes } },
                    { likes: lastComment.likes, _id: { $lte: cursor } }
                ];
                break;
        }
    }

    try {
        const comments = await Comment.find(query, { __v: false, updatedAt: false, postId: false })
            .sort(sortQuery)
            .limit(parsedLimit)
            .populate('author', 'username profileImage')
            .exec();

        const commentsLength = comments.length;

        // we will return a cursor pointing to the next comment, if we return 9 comments, we will send back the curosr of the 10th comment if there is one, or null if none.
        let nextCursor = null;

        if ((commentsLength && (commentsLength === parsedLimit))) {
            nextCursor = comments[commentsLength - 1]._id;
            comments.pop();
        }

        res.status(200).json({ cursor: nextCursor, comments });
    } catch (error) {
        next(error);
    }
}

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const errorMessages = {
            postId: getErrorMessage(errors, "postId"),
            body: getErrorMessage(errors, "body")
        }
        res.status(400).json({ errors: errorMessages });
        return;
    }
    const { postId, body } = matchedData<{ postId: ObjectId, body: string }>(req);

    let session = null;
    try {
        const post = await Post.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }

        const comment = new Comment({
            postId,
            author: req.user?.id,
            body,
        });
        post.comments++;

        session = await mongoose.startSession();
        session.startTransaction();

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

export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const errorMessages = {
            postId: getErrorMessage(errors, "postId"),
            commentId: getErrorMessage(errors, "commentId"),
            body: getErrorMessage(errors, "body")
        }
        res.status(400).json({ errors: errorMessages });
        return;
    }
    const { postId, commentId, body } = matchedData<{ postId: ObjectId, commentId: ObjectId, body: string }>(req);
    try {
        const comment = await Comment.findOne({ _id: commentId, postId });
        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }
        if (comment.author.toString() !== req.user?.id.toString()) {
            res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to update this comment.' });
            return;
        }
        comment.body = body;
        await comment.save();

        res.status(200).json({ message: "Updated" });  
    } catch (error) {
        next(error);
    }
}

export const likeComment = async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.postId;
    const commentId = req.params.commentId;

    if (!mongoose.isValidObjectId(commentId)) {
        res.status(400).json({ message: "Comment id is not valid!" });
        return;
    }

    let session = null;

    try {
        const comment = await Comment.findOne({ _id: commentId, postId });
        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }

        /*
            likeDoc: check if there is already a Like doc for this post by the authenticated user and with comment field null,
            so to update it, else create a new one
        */
        let likeDoc = await Like.findOne({ post: postId, user: req.user?.id, comment: commentId });
        // if the user is doing the same action (liking a post he already liked or the opposite)
        if (likeDoc) {
            res.status(200).json({ message: "Success" });
            return;
        }

        // Create a new like document
        likeDoc = new Like({
            user: req.user?.id,
            post: postId,
            comment: commentId,
        });

        comment.likes++;

        session = await mongoose.startSession();
        session.startTransaction();

        await likeDoc.save({ session });
        await comment.save({ session });

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

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    const { postId, commentId } = req.params;
    if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json({ message: "Invalid post id" });
        return;
    }
    if (!mongoose.isValidObjectId(commentId)) {
        res.status(400).json({ message: "Invalid comment id" });
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

        if (![Roles.ADMIN, Roles.MODERATOR].includes(req.user?.role as Roles) && (comment.author.toString() !== req.user?.id.toString())) {
            res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to delete this comment' });
            return;
        }
        post.comments--;

        session = await mongoose.startSession();
        session.startTransaction();

        await post.save({ session });

        await comment.deleteOne({ session });
        await Reply.deleteMany({ commentId }, { session });
        await Like.deleteMany({ comment: commentId }, { session });

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

export const unlikeComment = async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.postId;
    const commentId = req.params.commentId;

    if (!mongoose.isValidObjectId(commentId)) {
        res.status(400).json({ message: "Comment id is not valid!" });
        return;
    }

    let session = null;

    try {
        const comment = await Comment.findOne({ _id: commentId, postId });
        if (!comment) {
            res.status(404).json({ message: "Comment not found" });
            return;
        }

        /*
            likeDoc: check if there is already a Like document for this comment by the authenticated user,
        */
        const likeDoc = await Like.findOne({ post: postId, user: req.user?.id, comment: commentId });
        // if the user is doing the same reaction (liking a post he already liked or the opposite)
        if (!likeDoc) {
            res.status(200).json({ message: "Success" });
            return;
        }

        session = await mongoose.startSession();
        session.startTransaction();

        likeDoc.deleteOne({ session });
        comment.likes--;
        await comment.save({ session });

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