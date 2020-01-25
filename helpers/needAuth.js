module.exports = (req, res, next) => {
    if(req.isAuthenticated())
        next();
    else
        res.status(HTTP_UNAUTHORIZED).json({ error: 'Please login to use this feature.' });
}