const express = require('express');
const router = express();
const db = require('../helpers/db');
const utils = require('../helpers/utils');
const sendError = require('../helpers/sendError');

router.get('/:id', async (req, res) => {

    if(utils.isEmptyOrNull(req.params, 'id'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid event id.' });

    let { id } = req.params;

    try {

        let event = await db('events').select().where('id', id).first();

        if(utils.isNullOrUndefined(event))
            return res.json({ error: 'No such event.' })

        res.json(event);

    } catch (err) {
        sendError(res, err);
    }

});


module.exports = router;