import mongoose from "mongoose";
import { matchedData, validationResult } from "express-validator";

import Comment from "../mongoose/schemas/comment.js";
import Reply from "../mongoose/schemas/reply.js";
import Post from "../mongoose/schemas/post.js";
import Like from "../mongoose/schemas/like.js";
import { ROLES } from "../utils/enums.js";

export const getCommentReplies = async (req, res) => {
    let { limit = 20, cursor } = req.query;
    const { postId, commentId } = req.params;

    // is the limit query param valid
    limit = parseInt(limit);
    if (isNaN(limit)) {
        return res.status(400).json({ message: "limit should be a number" });
    }

    // the find() query
    const query = { postId, parentCommentId: commentId };
    if (cursor) {
        // is cursor valid
        if (!mongoose.isValidObjectId(cursor)) {
            return res.status(400).json({ message: "cursor is not valid" });
        }
        query._id = { $gte: cursor };
    }

    try {
        const replies = await Reply.find(query, { __v: false, parentCommentId: false, replyId: false })
            .sort({ _id: "ascending" }) // from the oldest reply to the newest
            .limit(limit + 1)
            .populate("owner", "username profileImage")
            .exec();

        const repliesLength = replies.length;

        // we will return a cursor pointing to the next comment, if we return 9 replies, we will send back the curosr of the 10th comment if there is one, or null if none.
        let nextCursor = null;

        if ((repliesLength && (repliesLength === limit + 1))) {
            nextCursor = replies[repliesLength - 1]._id;
            replies.pop();
        }

        return res.status(200).json({ cursor: nextCursor, replies });
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
}

export const createCommentReply = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) return res.status(400).json({ errors: result.array() });
    const { postId, commentId, replyUsername, replyId, body } = matchedData(req);

    let session = null;
    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = await Comment.findOne({ _id: commentId, postId })
            .populate("owner", "username")
            .exec();
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const reply = await Reply.findOne({ _id: replyId, postId, parentCommentId: commentId });
        if (!reply && replyUsername !== comment.owner.username) return res.status(404).json({ message: "Reply not found" });

        const newReply = new Reply({
            postId,
            parentCommentId: commentId,
            replyId,
            replyUsername,
            owner: req.user.id,
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
        const reply = await Reply.findOne({ _id: replyId, postId, parentCommentId: commentId });
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

    const { isLiked, isDisliked } = req.body;

    let session = null;

    try {
        const reply = await Reply.findOne({ _id: replyId, postId, parentCommentId: commentId });
        if (!reply) return res.status(404).json({ message: "Comment not found" });

        /*
            likeDoc: check if there is already a Like doc for this post by the authenticated user and with comment field null,
            so to update it, else create a new one
        */
        let likeDoc = await Like.findOne({ post: postId, user: req.user.id, comment: replyId });
        // if the user is doing the same action (liking a post he already liked or the opposite)
        if (likeDoc && likeDoc.isLiked === isLiked && likeDoc.isDisliked === isDisliked) {
            return res.status(409).json({ message: `You already ${action}d this comment` });
        }

        if (!likeDoc) {
            // Create a new like document
            likeDoc = new Like({
                user: req.user.id,
                post: postId,
                comment: replyId,
                isLiked,
                isDisliked
            });

            // Increment likes or dislikes based on the initial reaction
            if (isLiked) {
                reply.likes++;
            } else if (isDisliked) {
                reply.dislikes++;
            }
        } else {
            // Adjust counts based on the existing and new reactions
            if (likeDoc.isLiked && !isLiked) {
                reply.likes--; // Removing a like
            }
            if (likeDoc.isDisliked && !isDisliked) {
                reply.dislikes--; // Removing a dislike
            }
            if (!likeDoc.isLiked && isLiked) {
                reply.likes++; // Adding a like
            }
            if (!likeDoc.isDisliked && isDisliked) {
                reply.dislikes++; // Adding a dislike
            }
            // Update the like document
            likeDoc.isLiked = isLiked;
            likeDoc.isDisliked = isDisliked;
        }

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

        const reply = await Reply.findById(replyId);
        if (!reply) return res.status(404).json({ message: "reply not found" });

        if ((ROLES.USER === req.user.role) && (reply.owner.toString() !== req.user.id)) return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions to create a post.' });

        post.comments--;
        comment.replies--;

        session = await mongoose.startSession();
        session.startTransaction();

        await post.save({ session });
        await comment.save({ session });
        await reply.deleteOne().session(session);
        await Reply.deleteMany({ replyId }).session(session); // replies of the current reply to be deleted
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