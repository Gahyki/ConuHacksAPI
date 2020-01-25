const express = require('express');
const router = express();
const passport = require('passport');
const bcrypt = require('bcrypt');
const needAuth = require('../helpers/needAuth');
const db = require('../helpers/db');
const utils = require('../helpers/utils');
const sendError = require('../helpers/sendError');

router.post('/register', async (req, res) => {

    if(utils.isEmptyOrNull(req.body, 'email', 'username', 'password'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid request body.' });
    
    let { email, username, password } = req.body;
    
    try {

        // Check if email exists
        let existingUser = await db('users').select().where('email', email).first();
        if(existingUser)
            return res.status(HTTP_FORBIDDEN).json({ error: 'Email is already in use.' });

        // Field validation
        let userRegex = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        if(!utils.validateEmail(email) || username.length < 8 || username.length > 50 || userRegex.test(username) || password < 8 || password > 50)
            return res.status(HTTP_BAD_REQUEST).json({ error: 'Username, password, or email is invalid.' });

        // Insert user
        let user = {
            email,
            username,
            password: bcrypt.hashSync(password, 10)
        };
        await db('users').insert(user);

        // Send response
        res.json({ msg: 'User has successfully been registered.' });

    } catch (err) {
        sendError(err);
    }

});

router.post('/login', passport.authenticate('local'), needAuth, (req, res) => {
    res.json(req.user);
});

router.get('/current', needAuth, (req, res) => {
    res.json(req.user);
});

module.exports = router;