import mongoose from "mongoose";
import Post from "../mongoose/schemas/post.js";
import User from "../mongoose/schemas/user.js";
import Comment from "../mongoose/schemas/comment.js"
import Like from "../mongoose/schemas/like.js";
import { matchedData, validationResult } from "express-validator";
import { SORT } from "../utils/enums.js";
import getReaction from "../middleware/getReaction.js";

export const getPosts = async (req, res) => {

    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(400).json({ error: result.array() });
    }
    const { limit = 9, cursor, sort = SORT.LATEST, search = "", tags = "" } = matchedData(req);

    // the sort query
    const sortQuery = {};
    switch (sort) {
        case SORT.LATEST: sortQuery._id = -1; break;
        case SORT.OLDEST: sortQuery._id = 1; break;
        case SORT.TOP: sortQuery.likes = -1; sortQuery._id = -1; break
    }

    const findQuery = {};

    if (search !== "") {
        findQuery.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ]
    }

    if (tags !== "") {
        const arrayOfTags = tags.split(",");
        findQuery.tags = { $in: arrayOfTags };
    }

    if (cursor) {
        switch (sort) {
            case SORT.LATEST:
                findQuery._id = { $lte: cursor };
                break;
            case SORT.OLDEST:
                findQuery._id = { $gte: cursor };
                break;
            case SORT.TOP:
                const lastPost = await Post.findById(cursor);
                if (!lastPost) {
                    return res.status(400).json({ message: "Cursor does not exist" });
                }
                findQuery.$or = [
                    { likes: { $lt: lastPost.likes } },
                    { likes: lastPost.likes, _id: { $lte: cursor } }
                ];
                break;
        }
    }
    try {
        const posts = await Post.find(findQuery, { title: true, slug: true, cover: true, tags: true, likes: true, dislikes: true, comments: true, createdAt: true })
            .sort(sortQuery)
            .limit(parseInt(limit) + 1)
            .exec();

        // we will return a cursor pointing to the next post, if we return 9 posts, we will send back the curosr of the 10th post if there is one, or null if none.
        let nextCursor = null;
        if ((posts.length && posts.length === (parseInt(limit) + 1))) {
            nextCursor = posts[posts.length - 1]._id;
            posts.pop();
        }

        return res.json({
            cursor: nextCursor,
            posts
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const getPost = async (req, res) => {
    const postSlug = req.params.postSlug.trim();
    if (postSlug === '') return res.status(400).json({ message: "Invalid post id" });

    try {
        const foundPost = await Post.findOne({ slug: postSlug }, { __v: false, updatedAt: false })
            .populate('author', 'fullName username profileImage')
            .lean();

        if (!foundPost) return res.status(404).json({ message: "Post not found!" });

        return res.json(foundPost);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const getPostReaction = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.postId)) return res.status(400).json({ message: "Invalid post id" });
    getReaction(req, res);
}

export const createPost = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const message = {};
        message.title = errors.find((error) => error.path === "title")?.msg;
        message.description = errors.find((error) => error.path === "description")?.msg;
        message.headers = errors.find((error) => error.path === "headers")?.msg;
        message.cover = errors.find((error) => error.path === "cover")?.msg;
        message.content = errors.find((error) => error.path === "content")?.msg;
        message.tags = errors.find((error) => error.path === "tags")?.msg;
        console.log(message);
        return res.status(400).json({ message });
    }

    const { title, description, headers, cover, content, tags } = matchedData(req);

    try {
        const post = new Post({
            author: req.user.id,
            title,
            slug: title
                .toLowerCase()
                .trim()
                .replace(/[\s\W-]+/g, '-')  // Replace spaces and special characters with dashes
                .replace(/^-+|-+$/g, ''), // Remove leading or trailing dashes
            description,
            headers,
            cover,
            content,
            tags
        });
        await post.save();

        const response = { message: 'Post created successfully.' }
        if (req.newAccessToken) {
            response.accessToken = req.newAccessToken;
        }
        return res.status(201).json(response);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const updatePost = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.postId)) return res.status(400).json({ message: "Invalid post id" });

    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const message = {};
        message.title = errors.find((error) => error.path === "title")?.msg;
        message.description = errors.find((error) => error.path === "description")?.msg;
        message.content = errors.find((error) => error.path === "content")?.msg;
        message.tags = errors.find((error) => error.path === "tags")?.msg;
        return res.status(400).json({ message });
    }

    const data = matchedData(req);
    if (Object.keys(data).length === 0) return res.status(400).json({ message: "No valid fields provided for update" })

    const { title, description, content, tags } = data;

    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (title) post.title = title;
        if (description) post.description = description;
        if (content) post.content = content;
        if (tags) post.tags = tags.map(tag => tag.toLowerCase());

        await post.save();

        if (req.newAccessToken) {
            return res.status(200).json({ accessToken: req.newAccessToken });
        }
        return res.sendStatus(204);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const deletePost = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.postId)) return res.status(400).json({ message: "Invalid post id" });

    let session = null;

    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        session = await mongoose.startSession();
        session.startTransaction();

        await post.deleteOne().session(session);
        await Comment.deleteMany({ post: req.params.postId }).session(session);
        await Like.deleteMany({ post: req.params.postId }).session(session);

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

export const likeOrDislikePost = async (req, res) => {
    const postId = req.params.postId;
    if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ message: "Invalid post id" });

    const { isLiked, isDisliked } = req.body;

    let session = null;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        /*
            likeDoc: check if there is already a Like document for this post by the authenticated user and with comment field null,
            so to update it, else create a new one
        */
        let likeDoc = await Like.findOne({ post: postId, user: req.user.id, comment: null });
        // if the user is doing the same reaction (liking a post he already liked or the opposite)
        if (likeDoc && likeDoc.isLiked === isLiked && likeDoc.isDisliked === isDisliked) {
            return res.status(409).json({ message: 'You have already performed this reaction on this post' });
        }

        if (!likeDoc) {
            // Create a new like document
            likeDoc = new Like({
                user: req.user.id,
                post: postId,
                isLiked,
                isDisliked
            });

            // Increment likes or dislikes based on the initial reaction
            if (isLiked) {
                post.likes++;
            } else if (isDisliked) {
                post.dislikes++;
            }
        } else {
            // Adjust counts based on the existing and new reactions
            if (likeDoc.isLiked && !isLiked) {
                post.likes--; // Removing a like
            }
            if (likeDoc.isDisliked && !isDisliked) {
                post.dislikes--; // Removing a dislike
            }
            if (!likeDoc.isLiked && isLiked) {
                post.likes++; // Adding a like
            }
            if (!likeDoc.isDisliked && isDisliked) {
                post.dislikes++; // Adding a dislike
            }

            // Update the like document
            likeDoc.isLiked = isLiked;
            likeDoc.isDisliked = isDisliked;
        }

        session = await mongoose.startSession();
        session.startTransaction();

        await likeDoc.save({ session });
        await post.save({ session });

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