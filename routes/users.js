const express = require('express');
const router = express();
const passport = require('passport');
const bcrypt = require('bcrypt');
const needAuth = require('../helpers/needAuth');
const db = require('../helpers/db');
const utils = require('../helpers/utils');
const sendError = require('../helpers/sendError');

router.post('/register', async (req, res) => {

    if (utils.isEmptyOrNull(req.body, 'email', 'fname', 'lname', 'password'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid request body.' });

    let { email, fname, lname, password } = req.body;

    try {

        // Trim all fields
        email = email.trim();
        fname = fname.trim();
        lname = lname.trim();

        // Check if email exists
        let existingUser = await db('users').select().where('email', email).first();
        if (existingUser)
            return res.status(HTTP_FORBIDDEN).json({ error: 'Email is already in use.' });

        // Field validation
        let nameRegex = /[a-zA-z]{1,}/;
        if (!utils.validateEmail(email) || !nameRegex.test(fname) || !nameRegex.test(lname) || password < 8 || password > 50)
            return res.status(HTTP_BAD_REQUEST).json({ error: 'First name, last name, password, or email is invalid.' });

        // Insert user
        let user = {
            email,
            fname,
            lname,
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

router.get('/:id', async (req, res) => {
    if (utils.isEmptyOrNull(req.params, 'id'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid user id.' });

    let { id } = req.params;

    try {
        let event = await db('events').select().where('id', id).first();

        let user = await db('users').select().where('id', id).first();
        if (utils.isNullOrUndefined(user))
            return res.json({ error: 'No such user.' })

        delete user.password;

        let user_skills = await db('user_skills').select().where('user_id', id)
        user.skills = []
        if (utils.isEmptyOrNull(user_skills)) { // if user has no skills yet
            res.json(user)
        } else { // if user has skills
            for (let i = 0; i < user_skills.length; i++) {
                skill_id = user_skills[i].skill_id;
                let current_skill = await db('skills').select().where('id', skill_id).first()
                full_skill = {
                    name: current_skill.name,
                    rating: user_skills[i].rating,
                    nb_rating: user_skills[i].nb_rating
                }
                user.skills.push(full_skill)
            }
            res.json(user)
        }
    } catch (err) {
        sendError(res, err);
    }

});

module.exports = router;