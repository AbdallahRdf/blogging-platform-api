import { body, param } from 'express-validator';

export const commentCreationSchema = [
    param('postId')
        .isMongoId()
        .withMessage('Invalid post id'),
    body('body')
        .trim()
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
    body('replyId')
        .isMongoId()
        .withMessage('Invalid reply id'),
    body("replyUsername")
        .trim()
        .notEmpty()
        .withMessage('Parent comment username must not be empty')
        .isString()
        .withMessage('Parent comment username must be a string'),
    body('body')
        .trim()
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
        .notEmpty()
        .withMessage('Comment must not be empty')
        .isString()
        .withMessage('Comment must be a string')
];