import mongoose from "mongoose";
import Post from "../mongoose/schemas/post.js";
import User from "../mongoose/schemas/user.js";
import Comment from "../mongoose/schemas/comment.js"
import Like from "../mongoose/schemas/like.js";
import { matchedData, validationResult } from "express-validator";
import { ROLES, SORT } from "../utils/enums.js";

export const getComments = async (req, res) => {
    const { limit = 10, cursor, sort = SORT.TOP } = req.query;
    // is the limit query param valid
    if (isNaN(limit)) {
        return res.status(400).json({ message: "limit should be a number" });
    }

    // the sort query
    const sortQuery = {};
    switch (sort) {
        case SORT.LATEST: sortQuery._id = -1; break;
        case SORT.OLDEST: sortQuery._id = 1; break;
        case SORT.TOP: sortQuery.likes = -1; sortQuery._id = -1; break
        default: return res.status(400).json({ message: "Invalid sort query param value" });
    }

    // the find() query
    const query = { post: req.params.postId, replyTo: null };
    if (cursor) {
        // is cursor valid
        if (!mongoose.isValidObjectId(cursor)) {
            return res.status(400).json({ message: "cursor is not valid" });
        }

        if (sort === SORT.TOP) {
            const lastComment = await Comment.findById(cursor);
            if (!lastComment) {
                return res.status(400).json({ message: "Cursor does not exist" });
            }
            query.$or = [
                { likes: { $lt: lastComment.likes } },
                { likes: lastComment.likes, _id: { $lt: cursor } }
            ];
        } else if (sort === SORT.LATEST) {
            query._id = { $lt: cursor };
        } else {
            query._id = { $gt: cursor };
        }
    }

    try {
        const comments = await Comment.find(query, { __v: false, replyTo: false, updatedAt: false })
            .sort(sortQuery)
            .limit(limit)
            .populate('owner', 'username profileImage')
            .exec();

        const length = comments.length;

        const nextCursor = (length && length >= parseInt(limit)) ? comments[length - 1]._id : null;

        return res.status(200).json({ cursor: nextCursor, comments });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const getComment = async (req, res) => {
    try {
        const comment = await Comment.findOne({ _id: req.params.commentId, post: req.params.postId, replyTo: null }, { __v: false, replyTo: false, updatedAt: false })
            .populate('owner', 'username profileImage')
            .lean();

        return res.status(200).json(comment);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const createComment = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) return res.status(400).json({ errors: result.array() });
    const { postId, body } = matchedData(req);

    let session = null;
    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = new Comment({
            post: postId,
            owner: req.user.id,
            body,
        });
        post.comments++;

        session = await mongoose.startSession();
        session.startTransaction();

        await post.save({ session });
        await comment.save({ session });

        await session.commitTransaction();
        session.endSession();

        const response = { message: 'comment was created successfuly' };
        if (req.newAccessToken) {
            response.accessToken = req.newAccessToken;
        }
        return res.status(201).json(response);
    } catch (error) {
        if (session !== null) {
            await session.abortTransaction();
            session.endSession();
        }
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const updateComment = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) return res.status(400).json({ errors: result.array() });
    const { postId, commentId, body } = matchedData(req);
    try {
        const comment = await Comment.findOne({ _id: commentId, post: postId, replyTo: null });
        if (!comment) return res.status(404).json({ message: "Comment not found" });
        if (comment.owner.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to update this comment.' });
        comment.body = body;
        await comment.save();

        if (req.newAccessToken) {
            return res.status(200).json({ accessToken: req.newAccessToken });
        }
        return res.sendStatus(204);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const likeOrDislikeComment = async (req, res) => {
    const postId = req.params.postId;
    const commentId = req.params.commentId;

    if (!mongoose.isValidObjectId(commentId)) return res.status(400).json({ message: "Invalid comment id" });

    const { action } = req.body;

    if (!["like", "dislike"].includes(action)) return res.status(400).json({ message: "Invalid action. Must be 'like' or 'dislike'." });

    let session = null;

    try {
        const comment = await Comment.findOne({ _id: commentId, post: postId });
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const isLiked = action === "like";

        /*
            likeDoc: check if there is already a Like doc for this post by the authenticated user and with comment field null,
            so to update it, else create a new one
        */
        let likeDoc = await Like.findOne({ post: postId, user: req.user.id, comment: commentId });
        // if the user is doing the same action (liking a post he already liked or the opposite)
        if (likeDoc && likeDoc.isLiked === isLiked) return res.status(409).json({ message: `You already ${action}d this comment` });

        if (!likeDoc) {
            likeDoc = new Like({
                user: req.user.id,
                post: postId,
                comment: commentId,
                isLiked
            });
        } else {
            likeDoc.isLiked = isLiked;
            isLiked ? comment.dislikes-- : comment.likes--;
        }

        isLiked ? comment.likes++ : comment.dislikes++;

        session = await mongoose.startSession();
        session.startTransaction();

        await likeDoc.save({ session });
        await comment.save({ session });

        await session.commitTransaction();
        session.endSession();

        if (req.newAccessToken) {
            return res.status(200).json({ accessToken: req.newAccessToken });
        }
        return res.sendStatus(204);
    } catch (error) {
        if (session !== null) {
            await session.abortTransaction();
            session.endSession();
        }
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const deleteComment = async (req, res) => {
    const { postId, commentId } = req.params;
    if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ message: "Invalid post id" });
    if (!mongoose.isValidObjectId(commentId)) return res.status(400).json({ message: "Invalid comment id" });

    let session = null;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        if ((ROLES.USER === req.user.role) && (comment.owner.toString() !== req.user.id)) return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to delete this comment' });

        post.comments--;

        session = await mongoose.startSession();
        session.startTransaction();

        await post.save({ session });

        await comment.deleteOne().session(session);
        await Comment.deleteMany({ replyTo: commentId }).session(session);
        await Like.deleteMany({ comment: commentId }).session(session);

        await session.commitTransaction();
        session.endSession();

        if (req.newAccessToken) {
            return res.status(200).json({ accessToken: req.newAccessToken });
        }
        return res.sendStatus(204);
    } catch (error) {
        if (session !== null) {
            await session.abortTransaction();
            session.endSession();
        }

        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}