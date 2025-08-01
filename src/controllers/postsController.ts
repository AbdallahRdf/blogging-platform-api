import mongoose, { FilterQuery, ObjectId, SortOrder } from "mongoose";
import Post, { IPost, IPostContent } from "../models/post";
import User from "../models/user";
import Comment from "../models/comment"
import Like from "../models/like";
import { matchedData, validationResult } from "express-validator";
import { PostBlockType, Sort } from "../enums/post.enums";
import { NextFunction, Request, Response } from "express";
import { getErrorMessage } from "../utils/helpers";
import { generateTags } from "../ai/generateTags";

type GetPostsParams = {
    limit: string;
    cursor: ObjectId;
    sort: Sort;
    search: string;
    tags: string;
}

type CreatePostErrorMessages = {
    title?: string;
    description?: string;
    headers?: string;
    cover?: string;
    content?: string;
    tags?: string;
}

export const getPosts = async (req: Request, res: Response, next: NextFunction) => {

    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const errorMessages = {
            limit: getErrorMessage(errors, "limit"),
            cursor: getErrorMessage(errors, "cursor"),
            sort: getErrorMessage(errors, "sort"),
            search: getErrorMessage(errors, "search"),
            tags: getErrorMessage(errors, "tags"),
        }
        res.status(400).json({ errors: errorMessages });
        return;
    }
    const { limit, cursor, sort = Sort.LATEST, search = "", tags = "" } = matchedData<GetPostsParams>(req);

    const parsedLimit = (Number(limit) + 1) || 10;

    // the sort query
    let sortQuery: Record<string, SortOrder> = {};
    switch (sort) {
        case Sort.LATEST: sortQuery._id = -1; break;
        case Sort.OLDEST: sortQuery._id = 1; break;
        case Sort.TOP: sortQuery.likes = -1; sortQuery._id = -1; break
    }

    let findQuery: FilterQuery<IPost> = {};

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
            case Sort.LATEST:
                findQuery._id = { $lte: cursor };
                break;
            case Sort.OLDEST:
                findQuery._id = { $gte: cursor };
                break;
            case Sort.TOP:
                const lastPost = await Post.findById(cursor);
                if (!lastPost) {
                    res.status(400).json({ message: "Cursor does not exist" });
                    return;
                }
                findQuery.$or = [
                    { likes: { $lt: lastPost.likes } },
                    { likes: lastPost.likes, _id: { $lte: cursor } }
                ];
                break;
        }
    }

    try {
        const posts = await Post.find(findQuery, { title: true, slug: true, cover: true, tags: true, likes: true, comments: true, createdAt: true })
            .sort(sortQuery)
            .limit(parsedLimit)
            .exec();

        // we will return a cursor pointing to the next post, if we return 9 posts, we will send back the curosr of the 10th post if there is one, or null if none.
        let nextCursor = null;
        if (posts.length && (posts.length === parsedLimit)) {
            nextCursor = posts[posts.length - 1]._id;
            posts.pop();
        }

        res.status(200).json({
            cursor: nextCursor,
            posts
        });
    } catch (error) {
        next(error);
    }
}

export const getPost = async (req: Request, res: Response, next: NextFunction) => {
    const postSlug = req.params.postSlug.trim();
    if (postSlug === '') {
        res.status(400).json({ message: "Invalid post slug" });
        return;
    }

    try {
        const foundPost = await Post.findOne({ slug: postSlug }, { __v: false, updatedAt: false })
            .populate('author', 'fullName username profileImage')
            .lean();

        if (!foundPost) {
            res.status(404).json({ message: "Post not found!" });
            return;
        }

        res.status(200).json(foundPost);
    } catch (error) {
        next(error);
    }
}

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const message: Partial<CreatePostErrorMessages> = {
            title: getErrorMessage(errors, "title"),
            description: getErrorMessage(errors, "description"),
            headers: getErrorMessage(errors, "headers"),
            cover: getErrorMessage(errors, "cover"),
            content: getErrorMessage(errors, "content")
        }
        res.status(400).json({ message });
        return;
    }

    const { title, description, headers, cover, content } = matchedData<Omit<IPost, 'slug' | 'author' | 'likes' | 'comments' | 'tags'>>(req);

    let postContent = `title: ${title} \ndescription: ${description}`

    postContent += content.reduce((accumulator: string, postContentBlock: IPostContent) => {
        if (postContentBlock.type !== PostBlockType.IMAGE) {
            accumulator += `\n${postContentBlock.value}`
        }
        return accumulator;
    }, "");

    try {
        const tags = await generateTags(postContent) as string[];

        const post = new Post({
            author: req.user?.id,
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
        
        res.status(201).json({ message: "Created" });
    } catch (error) {
        next(error);
    }
}

export const updatePost = async (req: Request, res: Response, next: NextFunction) => {
    if (!mongoose.isValidObjectId(req.params.postId)) {
        res.status(400).json({ message: "Invalid post id" });
        return;
    }

    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const message: Partial<CreatePostErrorMessages> = {
            title: getErrorMessage(errors, "title"),
            description: getErrorMessage(errors, "description"),
            headers: getErrorMessage(errors, "headers"),
            cover: getErrorMessage(errors, "cover"),
            content: getErrorMessage(errors, "content"),
            tags: getErrorMessage(errors, "tags"),
        }
        res.status(400).json({ message });
        return;
    }

    const data = matchedData<Partial<IPost>>(req);
    if (Object.keys(data).length === 0) {
        res.status(200).json({ message: "Updated" });
        return;
    }

    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }

        if (data.title) {
            post.title = data.title;
            post.slug = data.title
                .toLowerCase()
                .trim()
                .replace(/[\s\W-]+/g, '-')  // Replace spaces and special characters with dashes
                .replace(/^-+|-+$/g, ''); // Remove leading or trailing dashes
        }
        if (data.description) post.description = data.description;
        if (data.headers) post.headers = data.headers;
        if (data.cover) post.cover = data.cover;
        if (data.content) post.content = data.content;
        if (data.tags) post.tags = data.tags.map(tag => tag.toLowerCase());

        await post.save();

        res.status(200).json({ message: "Updated" });
    } catch (error) {
        next(error);
    }
}

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
    if (!mongoose.isValidObjectId(req.params.postId)) {
        res.status(400).json({ message: "Invalid post id" });
        return;
    }

    let session = null;

    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }

        session = await mongoose.startSession();
        session.startTransaction();

        await post.deleteOne().session(session);
        await Comment.deleteMany({ post: req.params.postId }).session(session);
        await Like.deleteMany({ post: req.params.postId }).session(session);

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

export const likePost = async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.postId;
    if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json({ message: "Invalid post id" });
        return;
    }

    let session = null;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }

        /*
            likeDoc: check if there is already a Like document for this post by the authenticated user and with comment field null,
        */
        let likeDoc = await Like.exists({ post: postId, user: req.user?.id, comment: null });
        // if the user is doing the same reaction (liking a post he already liked or the opposite)
        if (likeDoc) {
            res.status(200).json({ message: "Success" });
            return;
        }

        // Create a new like document
        const newLike = new Like({
            user: req.user?.id,
            post: postId
        });

        post.likes++;

        session = await mongoose.startSession();
        session.startTransaction();

        await newLike.save({ session });
        await post.save({ session });

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

export const unlikePost = async (req: Request, res: Response, next: NextFunction) => {
    const postId = req.params.postId;

    if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json({ message: "Invalid post id" });
        return;
    }

    let session = null;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }

        /*
            likeDoc: check if there is already a Like document for this post by the authenticated user and with comment field null,
        */
        const likeDoc = await Like.findOne({ post: postId, user: req.user?.id, comment: null });
        // if the user is doing the same reaction (liking a post he already liked or the opposite)
        if (!likeDoc) {
            res.status(200).json({ message: "Success" });
            return;
        }

        session = await mongoose.startSession();
        session.startTransaction();

        likeDoc.deleteOne().session(session);
        post.likes--;
        await post.save({ session });

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