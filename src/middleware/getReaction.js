import Like from "../mongoose/schemas/like.js";

const getReaction = async (req, res) => {
    const post = req.params.postId;
    const comment = req.params.replyId ?? req.params.commentId ?? null;
    try {
        const reactionDoc = await Like.findOne({ post, user: req.user.id, comment }, { isLiked: true, isDisliked: true });
        if (!reactionDoc) {
            return res.status(404).json({ message: "Reaction document not found!", accessToken: req.newAccessToken });
        }
        const response = { isLiked: reactionDoc.isLiked, isDisliked: reactionDoc.isDisliked }
        if (req.newAccessToken) {
            response.accessToken = req.newAccessToken;
        }
        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
}

export default getReaction;