const validateReaction = (req, res, next) => {
    const { isLiked, isDisliked } = req.body;

    if (typeof isLiked !== 'boolean' || typeof isDisliked !== 'boolean') return res.status(400).json({ message: "Invalid body" });

    next();
}

export default validateReaction;