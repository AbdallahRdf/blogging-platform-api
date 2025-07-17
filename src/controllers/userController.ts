import mongoose, { FilterQuery, SortOrder } from "mongoose";
import bcrypt from 'bcrypt';
import User, { IUser } from "../models/user";
import { Sort } from "../enums/post.enums";
import { Roles } from "../enums/user.enums";
import { matchedData, validationResult } from "express-validator";
import { NextFunction, Request, Response } from "express";
import { getErrorMessage } from "../utils/helpers";

type UpdatableUserFields = {
    fullName: string;
    username: string;
    bio: string;
    profileImage: string;
    password: string;
}

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    const { limit, cursor, sort = Sort.LATEST, role } = req.query;

    if (!Object.values(Roles).includes(role as Roles)) {
        res.status(400).json({ message: "role query param is not valid, it should be either 'user' or 'moderator'" });
        return;
    }

    const parsedLimit = (Number(limit) + 1) || 10;

    const sortQuery: Record<string, SortOrder> = {};
    switch (sort) {
        case Sort.LATEST:
            sortQuery._id = -1;
            break;
        case Sort.OLDEST:
            sortQuery._id = 1;
            break;
        default:
            res.status(400).json({ message: "sort query param is not valid" });
            return;
    }

    const findQuery: FilterQuery<IUser> = { role };
    if (cursor) {
        if (!mongoose.isValidObjectId(cursor)) {
            res.status(400).json({ message: "cursor query param is not valid" });
            return;
        }
        if (sort === Sort.LATEST) {
            findQuery._id = { $lte: cursor };
        } else {
            findQuery._id = { $gte: cursor };
        }
    }

    try {
        const users = await User.find(findQuery, { fullName: true, username: true, profileImage: true })
            .sort(sortQuery)
            .limit(parsedLimit)
            .exec();

        const length = users.length;
        let nextCursor: string | null = null;
        if (length === parsedLimit) {
            nextCursor = users[length - 1]._id.toString();
            users.pop(); // Remove the last user to prevent it from being returned again
        }

        if (req.newAccessToken) {
            res.status(200).json({ accessToken: req.newAccessToken, cursor: nextCursor, users });
            return;
        }
        res.status(200).json({ cursor: nextCursor, users });
    } catch (error) {
        next(error);
    }
}

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findOne({ username: req.params.username }, { fullName: true, username: true, email: true, profileImage: true, bio: true, role: true });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        if (req.newAccessToken) {
            res.status(200).json({ accessToken: req.newAccessToken, user });
            return
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
        const errors = result.array();
        const errorMessages: Partial<UpdatableUserFields> = {
            fullName: getErrorMessage(errors, 'fullName'),
            username: getErrorMessage(errors, 'username'),
            bio: getErrorMessage(errors, 'bio'),
            profileImage: getErrorMessage(errors, 'profileImage'),
            password: getErrorMessage(errors, 'password')
        }
        res.status(400).json({ errors: errorMessages });
        return;
    }
    const data = matchedData<UpdatableUserFields>(req);
    if (Object.keys(data).length === 0) {
        res.sendStatus(204);
        return;
    }
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            res.status(404).json({ message: "User not found!" });
            return;
        }

        if (data.fullName) user.fullName = data.fullName;
        if (data.username) user.username = data.username;
        if (data.bio) user.bio = data.bio;
        if (data.profileImage) user.profileImage = data.profileImage;
        if (data.password) {
            const hash = await bcrypt.hash(data.password, 10);
            user.password = hash;
        }

        await user.save();

        if (req.newAccessToken) {
            res.status(200).json({ accessToken: req.newAccessToken });
            return;
        }
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    const username = req.params.username;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        if (![Roles.ADMIN, Roles.MODERATOR].includes(req.user?.role as Roles) || user.role !== req.user?.role) {
            res.status(403).json({ message: "You are not authorized to delete this user" });
            return;
        }

        if (user.role === req.user?.role) {
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none'
            });
        }

        await user.deleteOne();

        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
}

export const changeUserRole = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        res.status(400).json({ errors: result.array() });
        return;
    }
    const { username, role } = matchedData<{ username: string, role: Roles }>(req);
    try {
        const user = await User.findOne({ username });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        if (user.role === role) {
            res.status(200).json({ message: `User already have the '${role}' as the role value` });
            return;
        }

        user.role = role;
        await user.save();

        if (req.newAccessToken) {
            res.status(200).json({ accessToken: req.newAccessToken, message: `user role was updated successfully to '${role}'` });
            return;
        }
        res.status(200).json({ message: `user role was updated successfully to '${role}'` });
    } catch (error) {
        next(error);
    }
}