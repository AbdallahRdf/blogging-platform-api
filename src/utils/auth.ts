import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { Roles } from '../enums/user.enums';

export type TokenPayload = {
    id: Types.ObjectId;
    fullName: string;
    username: string;
    profileImage: string | null;
    role: Roles;
}

export const generateAccessToken = (user: TokenPayload) => {
    return jwt.sign(user, process.env.JWT_SECRET_KEY as string, { "expiresIn": "30min" });
}

export const generateRefreshToken = (user: TokenPayload) => {
    return jwt.sign(user, process.env.JWT_SECRET_KEY as string, { "expiresIn": "3d" });
}