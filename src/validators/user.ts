import { body, param } from "express-validator";
import User from "../models/user";
import { Roles } from "../enums/user.enums";

export const userUpdateSchema = [
    body('fullName')
        .optional()
        .trim()
        .notEmpty()
        .isString()
        .withMessage('Invalid full name'),
    body('username')
        .optional()
        .trim()
        .notEmpty()
        .isString()
        .withMessage('Invalid username')
        .custom(async (value) => {
            const user = await User.findOne({ username: value });
            return !user;
        })
        .withMessage('Username is already taken'),
    body('profileImage')
        .optional()
        .trim()
        .isURL()
        .withMessage('Invalid profile image url'),
    body('bio')
        .optional()
        .trim()
        .isString()
        .withMessage('Invalid bio'),
    body('password')
        .optional()
        .trim()
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        })
        .withMessage('Password must be at least 8 characters long and include one lowercase letter, one uppercase letter, one number, and one symbol.'),
];

export const changeUserRoleSchema = [
    param('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isString()
        .withMessage('Invalid username'),
    body('role')
        .trim()
        .custom((value) => Object.values(Roles).includes(value))
        .withMessage("Invalid role")
];