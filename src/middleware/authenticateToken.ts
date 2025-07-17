import jwt from "jsonwebtoken";
import checkRefreshToken from "./checkRefreshToken";
import { NextFunction, Request, Response } from "express";
import { TokenPayload } from "../utils/auth";

// check if there is a valid acces token, if yes then call next(), else call checkRefreshToken middleware. 
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // No access token, so call checkRefreshToken
        return checkRefreshToken(req, res, next);
    }
    try {
        jwt.verify(token, process.env.JWT_SECRET_KEY as string, (error, user) => {
            if (error) {
                // Token verification failed, so call checkRefreshToken
                return checkRefreshToken(req, res, next);
            }

            // Token is valid, attach user info to request
            req.user = user as TokenPayload;
            next();
        });
    } catch (error) {
        next(error);
    }
}

export default authenticateToken;