import { NextFunction, Request, Response } from "express";
import Like from "../models/like";

const getLikeStatus = async (req: Request, res: Response, next: NextFunction) => {
    const comment = req.params.replyId ?? req.params.commentId ?? null;
    try {
        const likeDoc = await Like.exists({ post: req.params.postId, user: req.user?.id, comment });
        let response: { liked: boolean, accessToken?: string } = { liked: !!likeDoc }
        if (req.newAccessToken) {
            response.accessToken = req.newAccessToken;
        }
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
}

export default getLikeStatus;