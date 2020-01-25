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

router.get('/:id/events', async (req, res) => {
    if (utils.isEmptyOrNull(req.params, 'id'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid user id.' });

    let { id } = req.params;

    try {
        let userjobs = await db('user_jobs').select().where('user_id', id);
        let eventQuery = db('events').select(); 

        userjobs.forEach(({ event_id }) => eventQuery.orWhere('id', event_id));

        let events = await eventQuery;
        let jobsQuery = db('jobs').select();
        let skillsQuery = db('skills').select();
        let tasksQuery = db('tasks').select();

        events.forEach(event => {
            event.jobs = JSON.parse(event.jobs);
            event.jobs.forEach(jobID => jobsQuery.orWhere('id', jobID));
        });

        let jobs = await jobsQuery;

        jobs.forEach(job => { 
            job.tasks = JSON.parse(job.tasks);
            job.skills = JSON.parse(job.skills);

            job.tasks.forEach(taskID => tasksQuery.orWhere('id', taskID));
            job.skills.forEach(skillID => skillsQuery.orWhere('id', skillID));
        });

        let skills = await skillsQuery;
        let tasks = await tasksQuery;
        
        events.forEach(event =>{

            for(let i in event.jobs)
                event.jobs[i] = jobs.find(j => j.id === event.jobs[i]);

            event.jobs.forEach(job => {
                if(utils.isNullOrUndefined(job))
                    return;
                
                for(let i in job.tasks)
                    job.tasks[i] = tasks.find(t => t.id === job.tasks[i])

                for(let i in job.skills)
                    job.skills[i] = skills.find(s => s.id === job.skills[i])
                
                job.tasks = job.tasks.filter(t => !utils.isNullOrUndefined(t));
                job.skills = job.skills.filter(s => !utils.isNullOrUndefined(s));

            });
            event.jobs = event.jobs.filter(j => !utils.isNullOrUndefined(j))
        });

        res.json(events);

    } catch(err){
        sendError(res, err);
    }
});


module.exports = router;