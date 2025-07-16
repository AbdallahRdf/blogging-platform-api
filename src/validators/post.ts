import { body, CustomValidator, query } from 'express-validator';
import { PostBlockType, Sort } from '../enums/post.enums';
import mongoose from 'mongoose';
import Post from '../models/post';

// ------------------ Custom Validators ------------------

const validateContentBlock = (block: any): true | string => {
    if (!Object.values(PostBlockType).includes(block.type)) {
        return 'Invalid block type';
    }
    if (!block.value || typeof block.value !== 'string') {
        return 'Block value must be a string';
    }
    if (block.type === PostBlockType.CODE_SNIPPET && !block.language) {
        return 'Code block requires a language';
    }
    return true;
};

const isContentValid: CustomValidator = (content: any[]) => {
    for (const block of content) {
        const validationResult = validateContentBlock(block);
        if (validationResult !== true) {
            throw new Error(validationResult);
        }
    }
    return true;
}

const isTagValid: CustomValidator = (tags: any[]) => {
    if (!tags.every(tag => typeof tag === 'string')) {
        throw new Error('Each tag must be a string');
    }
    return true;
};

const areHeadersValid: CustomValidator = (headers: any[]) => {
    for (const header of headers) {
        if (typeof header.value !== "string" || header.value === "") {
            throw new Error("Header value must be a non-empty string");
        }
        if (typeof header.id !== "string" || header.id === "") {
            throw new Error("Header ID must be a non-empty string");
        }
        if (!(["H2", "H3"].includes(header.type))) {
            throw new Error("Header type must be either H2 or H3");
        }
    }
    return true;
}

// ------------------ Validation Schemas ------------------

export const postCreationSchema = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Post title is required')
        .isString()
        .withMessage('Post title must be a string')
        .custom(async (title) => {
            if(await Post.exists({ title })) {
                throw new Error('Post title must be unique');
            }
            return true;
        }),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Post description is required')
        .isString()
        .withMessage('Post description must be a string'),
    body('headers')
        .isArray({ min: 1 })
        .withMessage('Headers must not be an empty array')
        .custom(areHeadersValid),
    body('cover')
        .trim()
        .notEmpty()
        .withMessage('Post Cover is required')
        .isString()
        .withMessage('Post Cover must be a URL string'),
    body('content')
        .isArray({ min: 1 })
        .withMessage('Content must not be an empty array')
        .custom(isContentValid),
    body('tags')
        .isArray({ min: 1 })
        .withMessage('Tags must not be an empty array')
        .custom(isTagValid)
        .withMessage('Each tag must be a string')
];

export const postUpdateSchema = [
    body('title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Post title is required')
        .isString()
        .withMessage('Post title must be a string')
        .custom(async (title) => {
            if(await Post.exists({ title })) {
                throw new Error('Post title must be unique');
            }
            return true;
        })
        .withMessage('Post title must be unique'),
    body('description')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Post description is required')
        .isString()
        .withMessage('Post description must be a string'),
    body('headers')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Headers must not be an empty array')
        .custom(areHeadersValid),
    body('cover')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Post Cover is required')
        .isString()
        .withMessage('Post Cover must be a URL string'),
    body('content')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Content must not be an empty array')
        .custom(isContentValid),
    body('tags')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Tags must not be an empty array')
        .custom(isTagValid)
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

    query('Sort')
        .optional()
        .isIn(Object.values(Sort))
        .withMessage('Invalid Sort query param value'),

    query('search')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Search query param must be a string'),

    query('tags')
        .optional()
        .isString()
        .matches(/^[a-zA-Z0-9,]*$/)
        .withMessage('Tags query param should be a comma-separated list of words')
];
