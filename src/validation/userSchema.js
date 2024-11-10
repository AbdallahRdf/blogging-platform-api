import { body, param } from "express-validator";
import User from "../mongoose/schemas/user.js";
import { ROLES } from "../utils/enums.js";

export const userUpdateSchema = [
    body('fullName')
        .trim()
        .notEmpty()
        .isString()
        .withMessage('Invalid full name')
        .optional(),
    body('username')
        .trim()
        .notEmpty()
        .isString()
        .withMessage('Invalid username')
        .custom(async (value) => {
            const user = await User.findOne({ username: value });
            return !Boolean(user);
        })
        .withMessage('Username is already taken')
        .optional(),
    body('email')
        .normalizeEmail()
        .isEmail()
        .withMessage('Email address is not valid')
        .custom(async (value) => {
            const user = await User.findOne({ email: value });
            return !Boolean(user);
        })
        .withMessage('Email address is already taken')
        .optional(),
    body('profileImage')
        .trim()
        .isURL()
        .withMessage('Invalid profile image url')
        .optional(),
    body('password')
        .trim()
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        })
        .escape()
        .withMessage('Password must be at least 8 characters long and include one lowercase letter, one uppercase letter, one number, and one symbol.')
        .optional(),
    ];

export const changeUserRoleSchema = [
    param('userId')
        .trim()
        .isMongoId()
        .withMessage('Invalid user id'),
    body('role')
        .trim()
        .custom((value) => [ROLES.ADMIN, ROLES.MODERATOR, ROLES.USER].includes(value))
        .withMessage("Invalid role, it should be 'user', 'moderator', or 'admin'")
];