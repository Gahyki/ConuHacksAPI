const express = require('express');
const router = express();
const db = require('../helpers/db');
const utils = require('../helpers/utils');
const sendError = require('../helpers/sendError');
const needAuth = require('../helpers/needAuth');

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

        // Find event
        let event = await db('events').select().where('id', id).first();

        // No event found
        if (utils.isNullOrUndefined(event))
            return res.json({ error: 'No such event.' });

        // Parse job ids
        event.jobs = JSON.parse(event.jobs);

        // Queries
        let jobsQuery = db('jobs').select();
        let skillsQuery = db('skills').select();
        let tasksQuery = db('tasks').select();

        // Execute skills and tasks queries ?
        let hasSkills = false;
        let hasTasks = false;
        
        // Exec jobs query and parse
        if(event.jobs.length > 0) {
            event.jobs.forEach(jobID => jobsQuery.where('id', jobID));
            event.jobs = await jobsQuery;
            event.jobs = event.jobs.filter(j => !utils.isNullOrUndefined(j));
            event.jobs.forEach(job => {
                job.title = JSON.parse(job.title);
                job.description = JSON.parse(job.description);
            });
        }

        // Find skills and tasks
        event.jobs.forEach(job => { 
            job.tasks = JSON.parse(job.tasks);
            job.skills = JSON.parse(job.skills);

            if(job.tasks.length > 0)
                hasTasks = true;

            if(job.skills.length > 0)
                hasSkills = true;

            job.tasks.forEach(taskID => tasksQuery.orWhere('id', taskID));
            job.skills.forEach(skillID => skillsQuery.orWhere('id', skillID));
        });

        let tasks = hasTasks ? await tasksQuery : [];
        let skills = hasSkills ? await skillsQuery : [];

        // Add and parse skills and tasks
        event.jobs.forEach(job => {
            for(let i in job.tasks)
                job.tasks[i] = tasks.find(t => t.id === job.tasks[i]);

            for(let i in job.skills)
                job.skills[i] = skills.find(s => s.id === job.skills[i]);
                
            job.tasks = job.tasks.filter(t => !utils.isNullOrUndefined(t));
            job.skills = job.skills.filter(s => !utils.isNullOrUndefined(s));

            job.tasks.forEach(task => task.name = JSON.parse(task.name));
            job.skills.forEach(skill => skill.name = JSON.parse(skill.name));
        });
        
        // Send event object
        res.json(event);

    } catch (err) {
        sendError(res, err);
    }

});

router.post('/create', async (req, res) => {
    if(utils.isEmptyOrNull(req.body, 'start', 'end', 'name', 'description', 'admins', 'jobs') || 
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

        // Create jobs
        let jobIDs = [];
        for(let job of jobs) {
            
            let taskIDs = [];
            for(let task of job.tasks) {

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

        // Verify admins
        admins = JSON.stringify(admins.filter(adminID => typeof adminID === 'number'));

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

    } catch(err) {
        sendError(res, err);
    }

});



module.exports = router;