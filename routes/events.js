const express = require('express');
const router = express();
const db = require('../helpers/db');
const utils = require('../helpers/utils');
const sendError = require('../helpers/sendError');
const needAuth = require('../helpers/needAuth');

router.get('/list', async (_, res) => {
    try {
        let events = await db('events').select().where('end', '>=', new Date());

        events.forEach(event => {
            event.name = JSON.parse(event.name);
            event.description = JSON.parse(event.description);
            event.admins = JSON.parse(event.admins);
            event.jobs = JSON.parse(event.jobs);
        });

        res.json(events);
    } catch (err) {
        sendError(res, err);
    }
});

router.post('/update', async (req, res) => {
    if (utils.isEmptyOrNull(req.body, 'id'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid request body.' });

    let { id } = req.body;
    let event = {}
    for (let item in req.body) {
        if (item == 'start' || item == 'end') {
            event[item] = new Date(req.body[item])
        } else if (item == 'name' || item == 'description' || item == 'admins' || item == 'jobs') {
            event[item] = JSON.stringify(req.body[item])
            if (item == 'admins') {
                if (event.admins == '[]') {
                    return res.status(HTTP_BAD_REQUEST).json({ error: 'Admins field cannot be 0' });
                }
            }
            if (item = 'name') {
                if (utils.isEmptyOrNull(JSON.parse(event.name), 'en', 'fr')) {
                    return res.status(HTTP_BAD_REQUEST).json({ error: 'Name cannot be empty' });
                }
            }
        }
    }
    try {
        await db('events').where('id', id).update(event)
        res.json({ msg: 'Event has been successfully updated' });
    } catch (err) {
        sendError(res, err);
    }
});

router.get('/:id', async (req, res) => {

    if (utils.isEmptyOrNull(req.params, 'id'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid event id.' });

    let { id } = req.params;

    try {

        // Find event
        let event = await db('events').select().where('id', id).first();

        // No event found
        if (utils.isNullOrUndefined(event))
            return res.json({ error: 'No such event.' });

        // Parse job ids and admin ids
        event.jobs = JSON.parse(event.jobs);
        event.admins = JSON.parse(event.admins);

        // Queries
        let jobsQuery = db('jobs').select();
        let skillsQuery = db('skills').select();
        let tasksQuery = db('tasks').select();
        let adminsQuery = db('users').select();

        // Execute skills and tasks queries ?
        let hasSkills = false;
        let hasTasks = false;

        // Exec jobs query, admin query and parse
        if (event.jobs.length > 0) {
            event.jobs.forEach(jobID => jobsQuery.orWhere('id', jobID));
            event.admins.forEach(adminID => adminsQuery.orWhere('id', adminID));

            if (event.jobs.length > 0)
                event.jobs = await jobsQuery;

            event.jobs.forEach(job => {
                job.title = JSON.parse(job.title);
                job.description = JSON.parse(job.description);
            });
            event.name = JSON.parse(event.name);
            event.description = JSON.parse(event.description);

            event.admins = await adminsQuery;
            event.admins.forEach(user => delete user.password);
        }
        // Find skills and tasks
        event.jobs.forEach(job => {
            job.tasks = JSON.parse(job.tasks);
            job.skills = JSON.parse(job.skills);

            if (job.tasks.length > 0)
                hasTasks = true;

            if (job.skills.length > 0)
                hasSkills = true;

            job.tasks.forEach(taskID => tasksQuery.orWhere('id', taskID));
            job.skills.forEach(skillID => skillsQuery.orWhere('id', skillID));
        });

        let tasks = hasTasks ? await tasksQuery : [];
        let skills = hasSkills ? await skillsQuery : [];

        tasks.forEach(t => t.name = JSON.parse(t.name));
        skills.forEach(s => s.name = JSON.parse(s.name));



        // Add and parse skills and tasks --problem starts here
        event.jobs.forEach(job => {
            //console.log(job);
            for (let i in job.tasks)
                job.tasks[i] = tasks.find(t => t.id === job.tasks[i]);

            for (let i in job.skills){
                job.skills[i] = skills.find(s => s.id === job.skills[i]);
                
            }
            job.tasks = job.tasks.filter(t => !utils.isNullOrUndefined(t));
            job.skills = job.skills.filter(s => !utils.isNullOrUndefined(s));
        });

        // Send event object
        res.json(event);

    } catch (err) {
        sendError(res, err);
    }

});

router.post('/signup', async (req, res) => {
    if (utils.isEmptyOrNull(req.body, 'user_id', 'event_id', 'job_id')) {
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid request body.' });
    }
    // Get user_id
    let { user_id, event_id, job_id } = req.body;

    try {
        let events = await db('user_jobs').select().where('user_id', user_id).andWhere('event_id', event_id).first();
        if(!utils.isNullOrUndefined(events))
            return res.status(HTTP_BAD_REQUEST).json({ error: 'User already registered for this event.' });

        let user_jobs = {
            user_id,
            event_id,
            job_id
        };
        await db('user_jobs').insert(user_jobs);

        let username = await db('users').select().where('id', user_id).first();

        res.json({ msg: `${username.fname}, you successfully registered to this event.` });
    } catch (err) {
        sendError(err);
    }
});

router.post('/create', async (req, res) => {
    if (utils.isEmptyOrNull(req.body, 'start', 'end', 'name', 'description', 'admins', 'jobs') ||
        typeof req.body.start !== 'string' ||
        typeof req.body.end !== 'string' ||
        typeof req.body.name !== 'object' ||
        typeof req.body.description !== 'object' ||
        !Array.isArray(req.body.admins) ||
        !Array.isArray(req.body.jobs))

        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid request body.' });

    let { start, end, name, description, admins, jobs } = req.body;

    try {

        // Parse dates
        start = new Date(start);
        end = new Date(end);

        // Stringify name and description
        name = JSON.stringify(name);
        description = JSON.stringify(description);

        // Verify admins
        admins = JSON.stringify(admins.filter(adminID => typeof adminID === 'number'));
        if (admins.length <= 0)
            return res.status(HTTP_BAD_REQUEST).json({ error: 'An event must have at least one admin user.' });

        // Create jobs
        let jobIDs = [];
        for (let job of jobs) {

            let taskIDs = [];
            for (let task of job.tasks) {

                // Insert task
                task.name = JSON.stringify(task.name);
                let [taskID] = await db('tasks').insert(task);
                taskIDs.push(taskID);

            }

            // Insert job
            job.title = JSON.stringify(job.title);
            job.description = JSON.stringify(job.description);
            job.tasks = JSON.stringify(taskIDs);
            job.skills = JSON.stringify(job.skills);
            let [jobID] = await db('jobs').insert(job);
            jobIDs.push(jobID);

        }
        jobs = JSON.stringify(jobIDs);

        // Insert event
        await db('events').insert({
            start,
            end,
            name,
            description,
            admins,
            jobs
        });

        res.json({ msg: 'Event created successfully.' });

    } catch (err) {
        sendError(res, err);
    }

});



module.exports = router;