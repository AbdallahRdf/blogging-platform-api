import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';
import { Sort } from '../enums/post.enums';

export const getCommentsSchema = [
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
        .withMessage('Invalid Sort query param value')
];

export const commentCreationSchema = [
    param('postId')
        .isMongoId()
        .withMessage('Invalid post id'),
    body('body')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Comment must not be empty')
        .isString()
        .withMessage('Comment must be a string')
];

export const commentUpdateSchema = [
    param('postId')
        .isMongoId()
        .withMessage('Invalid post id'),
    param('commentId')
        .isMongoId()
        .withMessage('Invalid comment id'),
    body('body')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Comment must not be empty')
        .isString()
        .withMessage('Comment must be a string')
];

export const replyCreationSchema = [
    param('postId')
        .isMongoId()
        .withMessage('Invalid post id'),
    param('commentId')
        .isMongoId()
        .withMessage('Invalid comment id'),
    body("replyToUsername")
        .trim()
        .notEmpty()
        .withMessage('Username of the user being replied to must be a string')
        .isString()
        .withMessage('Username of the user being replied to is required'),
    body('body')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Comment must not be empty')
        .isString()
        .withMessage('Comment must be a string')
];

export const replyUpdateSchema = [
    param('postId')
        .isMongoId()
        .withMessage('Invalid post id'),
    param('commentId')
        .isMongoId()
        .withMessage('Invalid comment id'),
    param('replyId')
        .isMongoId()
        .withMessage('Invalid reply id'),
    body('body')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Comment must not be empty')
        .isString()
        .withMessage('Comment must be a string')
];