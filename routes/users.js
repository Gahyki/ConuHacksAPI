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

        // Find user
        let user = await db('users').select().where('id', id).first();
        if (utils.isNullOrUndefined(user))
            return res.json({ error: 'No such user.' });

        // Delete password field
        delete user.password;

        // Find list of skill IDs
        let skills = await db('skills').select();
        let userSkills = await db('user_skills').select().where('user_id', id);
        user.skills = []
        if (userSkills.length <= 0)
            return res.json(user);

        // Find corresponding skill objects
        skills.forEach(skill => {
            let s = userSkills.find(s => s.skill_id === skill.id);
            if (s)
                user.skills.push({ id: skill.id, name: JSON.parse(skill.name), rating: s.rating, nb_rating: s.nb_rating });
            else
                user.skills.push({ id: skill.id, name: JSON.parse(skill.name), rating: 0, nb_rating: 0 });
        });

        // Send user object
        res.json(user);

    } catch (err) {
        sendError(res, err);
    }

});

router.get('/:id/events', async (req, res) => {
    if (utils.isEmptyOrNull(req.params, 'id'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid user id.' });

    let { id } = req.params;

    try {

        // Queries
        let userjobs = await db('user_jobs').select().where('user_id', id);
        let eventQuery = db('events').select();

        // Event list to be sent
        let events = [];

        // Find events and parse if necessary
        if (userjobs.length > 0) {
            userjobs.forEach(({ event_id }) => eventQuery.orWhere('id', event_id));
            events = await eventQuery;
            events.forEach(event => {
                event.name = JSON.parse(event.name);
                event.description = JSON.parse(event.description);
                event.admins = JSON.parse(event.admins);
                event.jobs = JSON.parse(event.jobs);
            });
        }

        // Send event list
        res.json(events);

    } catch (err) {
        sendError(res, err);
    }
});


module.exports = router;