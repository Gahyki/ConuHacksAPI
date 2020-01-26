const express = require('express');
const router = express();
const passport = require('passport');
const bcrypt = require('bcrypt');
const needAuth = require('../helpers/needAuth');
const db = require('../helpers/db');
const utils = require('../helpers/utils');
const sendError = require('../helpers/sendError');

router.get('/list', async (_, res) => {
    try {
        let skills = await db('skills').select();

        skills.forEach(skill => {
            skill.name = JSON.parse(skill.name);
        });

        res.json(skills);
    } catch (err) {
        sendError(res, err);
    }
});

module.exports = router;