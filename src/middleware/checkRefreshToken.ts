import User from "../models/user";
import jwt from 'jsonwebtoken';
import { generateAccessToken, TokenPayload } from '../utils/auth';
import { NextFunction, Request, Response } from "express";

// checks if there is a valid refresh token, then generate a new access token, attach it to the req object, then call newt(), else return a 4** status code response
const checkRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = req.cookies.refreshToken as string;

    if (!refreshToken) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    try {
        const foundUser = await User.findOne({ refreshTokens: { $in: [refreshToken] } });

        if (!foundUser) {
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none'
            });
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        jwt.verify(refreshToken, process.env.JWT_SECRET_KEY as string, async (error) => {
            if (error) {
                if (error.name === "TokenExpiredError") {
                    // Remove expired refresh token from user record
                    foundUser.refreshTokens.splice(foundUser.refreshTokens.indexOf(refreshToken), 1);
                    await foundUser.save();
                }
                res.clearCookie('refreshToken', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'none'
                });
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            // Generate new access token and attach to request
            const theUser: TokenPayload = {
                id: foundUser._id,
                fullName: foundUser.fullName,
                username: foundUser.username,
                profileImage: foundUser.profileImage,
                role: foundUser.role
            }

            const newAccessToken = generateAccessToken(theUser); 
            req.user = theUser; // Attach the user info to the request

            // Patch res.json here
            const originalJson = res.json;
            res.json = function (body: any) {
                if (typeof body === 'object' && body !== null) {
                    body.accessToken = newAccessToken;
                }
                return originalJson.call(this, body);
            };
            next();
        })
    } catch (error) {
        next(error);
    }
}

export default checkRefreshToken;