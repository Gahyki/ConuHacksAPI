const express = require('express');
const router = express();
const db = require('../helpers/db');
const utils = require('../helpers/utils');
const sendError = require('../helpers/sendError');

router.get('/list', async (req, res) => {
    try {
        current_date = new Date().toLocaleString()
        let events_list = await db('events').select().where('end', '>=', current_date);
        res.json(events_list);
    } catch (err) {
        sendError(res, err);
    }

});

router.get('/:id', async (req, res) => {

    if (utils.isEmptyOrNull(req.params, 'id'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid event id.' });

    let { id } = req.params;

    try {

        let event = await db('events').select().where('id', id).first();

        if (utils.isNullOrUndefined(event))
            return res.json({ error: 'No such event.' })

        res.json(event);

    } catch (err) {
        sendError(res, err);
    }

});




module.exports = router;