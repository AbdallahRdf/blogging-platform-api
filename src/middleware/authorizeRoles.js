const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions.' });
        }
        next();
    }
}

export default authorizeRoles;