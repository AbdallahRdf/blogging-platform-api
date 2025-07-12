import { NextFunction, Request, Response } from "express";
import { Roles } from "../enums/user.enums";

const authorizeRoles = (...allowedRoles: Roles[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if(req.user?.role && !allowedRoles.includes(req.user?.role)) {
            res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions.' });
            return;
        }
        next();
    }
}

export default authorizeRoles;