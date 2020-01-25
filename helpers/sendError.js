module.exports = (res, err) => {
    res.status(HTTP_INTERNAL_ERROR).send({ error: err.message, stack: err.stack });
}