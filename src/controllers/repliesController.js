import mongoose from "mongoose";
import { matchedData, validationResult } from "express-validator";

import Comment from "../mongoose/schemas/comment.js";
import Post from "../mongoose/schemas/post.js";
import Like from "../mongoose/schemas/like.js";
import { ROLES } from "../utils/enums.js";

export const getCommentReplies = async (req, res) => {
    try {
        const replies = await Comment.find({ post: req.params.postId, replyTo: req.params.commentId }, { __v: false, replyTo: false })
            .populate("owner", "username profileImage")
            .sort({ _id: -1 })
            .lean();

        return res.status(200).json({ replies });
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
}

export const createCommentReply = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) return res.status(400).json({ errors: result.array() });
    const { commentId, postId, body } = matchedData(req);

    let session = null;
    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = await Comment.findOne({ _id: commentId, post: postId });
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const reply = new Comment({
            post: postId,
            replyTo: commentId,
            owner: req.user.id,
            body,
        });
        post.comments++;
        comment.replies++;

        session = await mongoose.startSession();
        session.startTransaction();

        await reply.save({ session });
        await post.save({ session });
        await comment.save({ session });

        await session.commitTransaction();
        session.endSession();

        const response = { message: 'comment reply was created successfuly' }
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
        return res.status(500).json(error);
    }
}

export const updateCommentReply = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) return res.status(400).json({ errors: result.array() });
    const { postId, commentId, replyId, body } = matchedData(req);
    try {
        const reply = await Comment.findOne({ _id: replyId, post: postId, replyTo: commentId });
        if (!reply) return res.status(404).json({ message: "Comment reply not found" });
        if (reply.owner.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to update this comment.' });
        reply.body = body;
        await reply.save();

        if (req.newAccessToken) {
            return res.status(200).json({ accessToken: req.newAccessToken });
        }
        return res.sendStatus(204);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error });
    }
}

export const likeOrDislikeReply = async (req, res) => {
    const postId = req.params.postId;
    const commentId = req.params.commentId;
    const replyId = req.params.replyId;

    if (!mongoose.isValidObjectId(replyId)) return res.status(400).json({ message: "Invalid comment reply id" });

    const { action } = req.body;

    if (!["like", "dislike"].includes(action)) return res.status(400).json({ message: "Invalid action. Must be 'like' or 'dislike'." });

    let session = null;

    try {
        const reply = await Comment.findOne({ _id: replyId, post: postId, replyTo: commentId });
        if (!reply) return res.status(404).json({ message: "Comment not found" });

        const isLiked = action === "like";

        /*
            likeDoc: check if there is already a Like doc for this post by the authenticated user and with comment field null,
            so to update it, else create a new one
        */
        let likeDoc = await Like.findOne({ post: postId, user: req.user.id, comment: replyId });
        // if the user is doing the same action (liking a post he already liked or the opposite)
        if (likeDoc && likeDoc.isLiked === isLiked) return res.status(409).json({ message: `You already ${action}d this comment` });

        if (!likeDoc) {
            likeDoc = new Like({
                user: req.user.id,
                post: postId,
                comment: replyId,
                isLiked
            });
        } else {
            likeDoc.isLiked = isLiked;
            isLiked ? reply.dislikes-- : reply.likes--;
        }

        isLiked ? reply.likes++ : reply.dislikes++;

        session = await mongoose.startSession();
        session.startTransaction();

        await likeDoc.save({ session });
        await reply.save({ session });

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
        return res.status(500).json(error);
    }
}

export const deleteCommentReply = async (req, res) => {
    const { postId, commentId, replyId } = req.params;
    if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ message: "Invalid post id" });
    if (!mongoose.isValidObjectId(commentId)) return res.status(400).json({ message: "Invalid comment id" });
    if (!mongoose.isValidObjectId(replyId)) return res.status(400).json({ message: "Invalid comment reply id" });

    let session = null;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const reply = await Comment.findById(replyId);
        if (!reply) return res.status(404).json({ message: "reply not found" });

        if ((ROLES.USER === req.user.role) && (reply.owner.toString() !== req.user.id)) return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to create a post.' });

        post.comments--;
        comment.replies--;

        session = await mongoose.startSession();
        session.startTransaction();

        await post.save({ session });
        await comment.save({ session });
        await reply.deleteOne().session(session);
        await Comment.deleteMany({ replyTo: replyId }).session(session); // replies of the current reply to be deleted
        await Like.deleteMany({ comment: replyId }).session(session); // delete the likes doc for the reply doc

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
        return res.status(500).json(error);
    }
}