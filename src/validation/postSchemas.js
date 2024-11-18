import { body, param, query } from 'express-validator';
import { POST_BODY_BLOCKS, SORT } from '../utils/enums.js';
import mongoose from 'mongoose';
import Post from '../mongoose/schemas/post.js';

const validateContentBlock = (block) => {
    // Perform validation for a single content block
    if (![...Object.values(POST_BODY_BLOCKS)].includes(block.type)) {
        return false;
    }
    if (!block.value || typeof block.value !== 'string') {
        return false;
    }
    if (block.type === POST_BODY_BLOCKS.CODE_SNIPPET && !block.language) {
        return false;
    }
    return true;
};

export const postCreationSchema = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Post title is required')
        .isString()
        .withMessage('Post title must be a string')
        .custom(async (title) => {
            const post = await Post.findOne({ title });
            return !Boolean(post);
        })
        .withMessage('Post title must be unique'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Post description is required')
        .isString()
        .withMessage('Post description must be a string'),
    body('headers')
        .isArray()
        .withMessage('Headers must be an array')
        .custom((headers) => {
            return headers.length !== 0;
        })
        .withMessage('Headers must not be empty')
        .custom((headers) => {
            for (const header of headers) {
                if (typeof header.value !== "string" || header.value === "") {
                    return false;
                }
                if (typeof header.id !== "string" || header.id === "") {
                    return false;
                }
                if (!(["H2", "H3"].includes(header.type))) {
                    return false;
                }
            }
            return true;
        })
        .withMessage('All headers must be string'),
    body('cover')
        .trim()
        .notEmpty()
        .withMessage('Post Cover is required')
        .isString()
        .withMessage('Post Cover must be a URL string'),
    body('content')
        .isArray()
        .withMessage('Content must be an array')
        .custom((content) => {
            if (content.length === 0) return false;
            return true;
        })
        .withMessage('Content must not be empty')
        .custom((content) => {
            for (const block of content) {
                if (!validateContentBlock(block)) {
                    return false;
                }
            }
            return true;
        })
        .withMessage('Invalid content block format'),
    body('tags')
        .isArray()
        .withMessage('Tags must be an array')
        .custom((tags) => {
            if (tags.length === 0) return false;
            return true;
        })
        .withMessage('Tags must not be an empty array')
        .custom((tags) => {
            return tags.every(tag => typeof tag === 'string');
        })
        .withMessage('Each tag must be a string')
];

export const postUpdateScema = [
    body('title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Post title is required')
        .isString()
        .withMessage('Post title must be a string'),
    body('description')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Post description is required')
        .isString()
        .withMessage('Post description must be a string'),
    body('content')
        .optional()
        .isArray()
        .withMessage('Content must be an array')
        .custom((content) => {
            if (content.length === 0) return false;
            return true;
        })
        .withMessage('Content must not be empty')
        .custom((content) => {
            for (const block of content) {
                if (!validateContentBlock(block)) {
                    return false;
                }
            }
            return true;
        })
        .withMessage('Invalid content block format'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array')
        .custom((tags) => {
            if (tags.length === 0) return false;
            return true;
        })
        .withMessage('Tags must not be an empty array')
        .custom((tags) => {
            return tags.every(tag => typeof tag === 'string');
        })
        .withMessage('Each tag must be a string')
];

export const getPostsSchema = [
    query('limit')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Limit should be a positive integer'),

    query('cursor')
        .optional()
        .custom((value) => {
            if (!mongoose.isValidObjectId(value)) {
                throw new Error('Cursor is not valid');
            }
            return true;
        }),

    query('sort')
        .optional()
        .isIn([SORT.LATEST, SORT.OLDEST, SORT.TOP])
        .withMessage('Invalid sort query param value'),

    query('search')
        .optional()
        .isString()
        .trim()
        .withMessage('Search query param must be a string'),

    query('tags')
        .optional()
        .isString()
        .matches(/^[a-zA-Z0-9,]*$/)
        .withMessage('Tags query param should be a comma-separated list of words')
];
