import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../mongoose/schemas/user.js';
import { matchedData, validationResult } from "express-validator";
import { generateAccessToken, generateRefreshToken } from '../utils/auth.js';
import { sendActivationEmail, sendResetPasswordEmail } from '../utils/email.js';

export const signup = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array();
        const message = {};
        message.fullName = errors.find(error => error.path === "fullName")?.msg;
        message.username = errors.find(error => error.path === "username")?.msg;
        message.email = errors.find(error => error.path === "email")?.msg;
        message.password = errors.find(error => error.path === "password")?.msg;
        return res.status(400).json({ message });
    }
    const { fullName, username, email, password } = matchedData(req);
    try {

        const hashedPassword = await bcrypt.hash(password, 12);
        const token = crypto.randomBytes(32).toString('hex');

        const newUser = new User({
            fullName,
            username: `@${username}`,
            email,
            password: hashedPassword,
            activationToken: token,
            activationTokenExpires: Date.now() + (3600000 * 24) // 24 hours
        });

        await newUser.save();

        await sendActivationEmail(email, token);

        return res.status(201).json({ message: "Signup successful! Please check your email to activate your account." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Error occured while signup process ${error.message}` });
    }
}

export const login = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(400).json({ errorMessage: 'Invalid credentials' });
    }
    const { email, password } = matchedData(req);
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ errorMessage: 'Invalid credentials' });
        }

        const isMatched = await bcrypt.compare(password, user.password);

        if (!isMatched) {
            return res.status(400).json({ errorMessage: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Your account is not activated. Please check your email for the activation link." });
        }

        const theUser = {
            id: user._id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage,
            role: user.role
        }

        const accessToken = generateAccessToken(theUser);
        const refreshToken = generateRefreshToken(theUser);

        user.refreshTokens.push(refreshToken);
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: process.env.NODE_ENV === 'production',  // Only use secure cookies in production
            maxAge: 7 * 24 * 60 * 60 * 1000 // 3 days
        });

        return res.status(200).json({ accessToken });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Error occured while login process: ${error.message}` });
    }
}

export const activateAccount = async (req, res) => {
    const token = req.params.token;

    try {
        const user = await User.findOne({ activationToken: token });
        if (!user) {
            return res.status(404).json({ message: "Token is not found or invalid" });
        }

        if (user.activationTokenExpires < Date.now()) {
            user.activationToken = null;
            user.activationTokenExpires = null;
            await user.save();
            return res.status(400).json({ message: "Token has expired" });
        }

        user.activationToken = null;
        user.activationTokenExpires = null;
        user.isActive = true;

        await user.save();

        return res.status(200).json({ message: "Your account has been successfully activated. Please log in to continue." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Error occured: ${error.message}` });
    }
}

export const resendActivationEmail = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(400).json({ message: result.array() });
    }
    const { email } = matchedData(req);
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.isActive) {
            return res.status(400).json({ message: "Your account is already activated" });
        }

        const token = crypto.randomBytes(32).toString('hex');

        user.activationToken = token,
            user.activationTokenExpires = Date.now() + (3600000 * 24) // 24 hours

        await user.save();

        await sendActivationEmail(email, token);

        return res.status(200).json({ message: "Email was sent! Please check your email to activate your account." });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Error occured while resending activation email: ${error.message}` });
    }
}

export const logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(200).json({ message: 'Already logged out' });
    }

    try {
        const foundUser = await User.findOne({ refreshTokens: { $in: [refreshToken] } });

        if (!foundUser) {
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'None'
            });
            return res.status(400).json({ message: 'refresh token is not found' });
        }

        foundUser.refreshTokens.pull(refreshToken);
        await foundUser.save();

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None'
        });

        return res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Error occured while logout process: ${error.message}` });
    }
}

export const refreshToken = async (req, res) => {
    return res.status(200).json({ accessToken: req.newAccessToken });
}

export const generateTokenForPasswordReset = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) return res.status(400).json({ message: result.array() });
    const { email } = matchedData(req);

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ message: 'If the email exists in our system, you will receive a password reset link shortly.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000 // 1 hour
        await user.save();

        await sendResetPasswordEmail(email, token);

        res.status(200).json({ message: 'If the email exists in our system, you will receive a password reset link shortly.' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Error occured: ${error.message}` });
    }
}

export const validatePasswordResetToken = async (req, res) => {
    const token = req.params.token;
    try {
        const user = await User.findOne({ resetPasswordToken: token });

        if (!user) {
            return res.status(404).json({ message: "Token is not found or invalid" });
        }

        if (user.resetPasswordExpires < Date.now()) {
            user.resetPasswordExpires = null;
            user.resetPasswordToken = null;
            await user.save();
            return res.status(400).json({ message: "Token has expired" });
        }

        return res.sendStatus(200);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Error occured: ${error.message}` });
    }
}

export const updatePassword = async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.status(400).json({ message: result.array() });
    }
    const { token, password } = matchedData(req);
    try {
        const user = await User.findOne({ resetPasswordToken: token });
        if (!user) {
            return res.status(404).json({ message: "Token is not found or invalid" });
        }

        if (user.resetPasswordExpires < Date.now()) {
            return res.status(400).json({ message: "Token has expired" });
        }

        const hash = await bcrypt.hash(password, 12);

        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.password = hash;

        await user.save();

        return res.status(200).json({ message: "Password was updated successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Error occured: ${error.message}` });
    }
}