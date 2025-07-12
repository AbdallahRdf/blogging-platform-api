import { matchedData, ValidationError, validationResult } from "express-validator";
import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import User from '../models/user';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../utils/auth.js';
import { sendResetPasswordEmail } from '../utils/email';
import { getErrorMessage } from "../utils/helpers";

type RegisterUser = {
    fullName: string;
    username: string;
    email: string;
    password: string;
}

export const signup = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();

        const errorMessages: Partial<RegisterUser> = {
            fullName: getErrorMessage(errors, 'fullName'),
            username: getErrorMessage(errors, 'username'),
            email: getErrorMessage(errors, 'email'),
            password: getErrorMessage(errors, 'password')
        };
        res.status(400).json({ errors: errorMessages });
        return;
    }
    const { fullName, username, email, password } = matchedData<RegisterUser>(req);
    try {

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            fullName,
            username: `@${username}`,
            email,
            password: hashedPassword,
        });

        const user = await newUser.save();

        const payload: TokenPayload = {
            id: user._id,
            fullName: user.fullName,
            username: user.username,
            profileImage: user.profileImage,
            role: user.role
        }

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        user.refreshTokens.push(refreshToken);
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        });

        res.status(201).json({ accessToken });
    } catch (error) {
        next(error);
    }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        res.status(400).json({ errorMessage: 'Invalid credentials' });
        return;
    }
    const { email, password } = matchedData<Omit<RegisterUser, 'fullName' | 'username'>>(req);
    try {
        const user = await User.findOne({ email });

        if (!user) {
            res.status(400).json({ errorMessage: 'Invalid credentials' });
            return;
        }

        const isMatched = await bcrypt.compare(password, user.password);

        if (!isMatched) {
            res.status(400).json({ errorMessage: 'Invalid credentials' });
            return;
        }

        const payload: TokenPayload = {
            id: user._id,
            fullName: user.fullName,
            username: user.username,
            profileImage: user.profileImage,
            role: user.role
        }

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        user.refreshTokens.push(refreshToken);
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
            maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
        });

        res.status(200).json({ accessToken });
    } catch (error) {
        next(error);
    }
}

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken as string;

    if (!refreshToken) {
        res.sendStatus(204);
        return;
    }

    try {
        const foundUser = await User.findOne({ refreshTokens: { $in: [refreshToken] } });

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none'
        });

        if (!foundUser) {
            res.sendStatus(204);
            return;
        }

        foundUser.refreshTokens.splice(foundUser.refreshTokens.indexOf(refreshToken), 1);
        await foundUser.save();

        res.sendStatus(204);
        return;
    } catch (error) {
        next(error);
    }
}

export const handlePasswordReset = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        res.status(400).json({ message: result.array() });
        return;
    }
    const { email } = matchedData<{ email: string }>(req);

    try {
        const user = await User.findOne({ email });

        if (!user) {
            res.sendStatus(204);
            return;
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000 // 1 hour
        await user.save();

        await sendResetPasswordEmail(email, token);

        res.sendStatus(204);
    } catch (error) {
        next(error);    
    }
}

export const validatePasswordResetToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.params.token;
    try {
        const user = await User.findOne({ resetPasswordToken: token });

        if (!user) {
            res.status(400).json({ message: "Invalid token" });
            return;
        }

        if (typeof user.resetPasswordExpires === "number" && user.resetPasswordExpires < Date.now()) {
            user.resetPasswordExpires = null;
            user.resetPasswordToken = null;
            await user.save();
            res.status(400).json({ message: "Invalid token" });
            return;
        }

        res.sendStatus(200);
        return;
    } catch (error) {
        next(error);
    }
}

export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        res.status(400).json({ message: result.array() });
        return;
    }
    const { token, password } = matchedData<{token: string, password: string}>(req);
    try {
        const user = await User.findOne({ resetPasswordToken: token });
        
        if (!user || (typeof user.resetPasswordExpires === "number" && user.resetPasswordExpires < Date.now())) {
            res.status(400).json({ message: "Invalid token" });
            return
        }

        const hash = await bcrypt.hash(password, 12);

        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.password = hash;

        await user.save();

        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
}