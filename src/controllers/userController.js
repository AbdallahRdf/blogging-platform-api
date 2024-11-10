import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import User from "../mongoose/schemas/user.js";
import { ROLES, SORT } from "../utils/enums.js";
import { matchedData, validationResult } from "express-validator";

export const getUser = async (req, res) => {
    const userId = req.params.userId ?? req.user.id;

    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "User id is not valid" });

    try {
        const user = await User.findById(userId, { fullName: true, username: true, email: true, profileImage: true, role: true });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (req.newAccessToken) {
            return res.status(200).json({ accessToken: req.newAccessToken, user });
        }
        return res.status(200).json(user);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const getUsers = async (req, res) => {
    const { limit = 10, cursor, sort = SORT.LATEST, role } = req.query;

    if (![ROLES.MODERATOR, ROLES.USER, ROLES.ADMIN].includes(role)) return res.status(400).json({ message: "role query param is not valid, it should be either 'user' or 'moderator'" })

    if (isNaN(limit)) return res.status(400).json({ message: "limit query param must be a number" });

    const sortQuery = {};
    switch (sort) {
        case SORT.LATEST:
            sortQuery._id = -1;
            break;
        case SORT.OLDEST:
            sortQuery._id = 1;
            break;
        default:
            return res.status(400).json({ message: "sort query param is not valid" })
    }

    const findQuery = { role };
    if (cursor) {
        if (!mongoose.isValidObjectId(cursor)) return res.status(400).json({ message: "cursor query param is not valid" });
        if (sort === SORT.LATEST) {
            findQuery._id = { $lt: cursor };
        } else {
            findQuery._id = { $gt: cursor };
        }
    }

    try {
        const users = await User.find(findQuery, { fullName: true, username: true, profileImage: true, isActive: true })
            .sort(sortQuery)
            .limit(limit)
            .exec();

        const length = users.length;
        const nextCursor = (length >= parseInt(limit)) ? users[length - 1]._id : null;

        if (req.newAccessToken) {
            return res.status(200).json({ accessToken: req.newAccessToken, cursor: nextCursor, users });
        }
        return res.status(200).json({ cursor: nextCursor, users });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const updateUser = async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
        const errors = result.array();
        const message = {};
        message.fullName = errors.find(error => error.path === "fullName")?.msg;
        message.username = errors.find(error => error.path === "username")?.msg;
        message.email = errors.find(error => error.path === "email")?.msg;
        message.profileImage = errors.find(error => error.path === "profileImage")?.msg;
        message.password = errors.find(error => error.path === "password")?.msg;
        return res.status(400).json({ message });
    }
    const data = matchedData(req);

    if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: "You have to add fields to update" });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found!" });

        if (data.fullName) user.fullName = data.fullName;
        if (data.username) user.username = data.username;
        if (data.email) user.email = data.email;
        if (data.profileImage) user.profileImage = data.profileImage;
        if (data.password) {
            const hash = await bcrypt.hash(data.password, 10);
            user.password = hash;
        }

        await user.save();

        if (req.newAccessToken) {
            return res.status(200).json({ accessToken: req.newAccessToken });
        }
        return res.sendStatus(204);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const deleteUser = async (req, res) => {
    const userId = req.params.userId ?? req.user.id;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "Invalid user id" });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        await user.deleteOne();

        if (req.newAccessToken && req.user.id) {
            return res.status(200).json({ accessToken: req.newAccessToken });
        }
        return res.sendStatus(204);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export const changeUserRole = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(400).json({ errors: result.array() });
    }
    const { userId, role } = matchedData(req);
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.role === role) return res.status(409).json({ message: `User already have the '${role}' as the role value` });

        user.role = role;
        await user.save();

        if (req.newAccessToken) {
            return res.status(200).json({ accessToken: req.newAccessToken, message: `user role was updated successfully to '${role}'` });
        }
        return res.status(200).json({ message: `user role was updated successfully to '${role}'` });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}