const express = require('express');
const router = express();
const db = require('../helpers/db');
const utils = require('../helpers/utils');
const sendError = require('../helpers/sendError');
const needAuth = require('../helpers/needAuth');

router.get('/:id', async (req, res) => {

    if (utils.isEmptyOrNull(req.params, 'id'))
        return res.status(HTTP_BAD_REQUEST).json({ error: 'Invalid event id.' });

    let { id } = req.params; //selected event id

    try {
        //comparing event ids
        let event = await db('events').select().where('id', id).first(); 

        if(utils.isNullOrUndefined(event))
            return res.json({ error: 'No such event.' });

        //Arrays to be read
        event.jobs = JSON.parse(event.jobs);

        //selecting queries
        let jobsQuery = db('jobs').select();
        let skillsQuery = db('skills').select();
        let tasksQuery = db('tasks').select();

        if(event.jobs.length > 0) {
            event.jobs.forEach(jobID => jobsQuery.where('id', jobID));
            event.jobs = await jobsQuery;
        }
        
        event.jobs.forEach(job => { 
            job.tasks = JSON.parse(job.tasks);
            job.skills = JSON.parse(job.skills);

            job.tasks.forEach(taskID => tasksQuery.where('id', taskID));
            job.skills.forEach(skillID => skillsQuery.where('id', skillID));
        });

        let tasks = await tasksQuery;
        let skills = await skillsQuery;

        event.jobs.forEach(job => {
            for(let i in job.tasks)
                job.tasks[i] = tasks.find(t => t.id === job.tasks[i]);
            for(let i in job.skills)
                job.skills[i] = skills.find(s => s.id === job.skills[i]);        
        });

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
        start = Date.parse(start);
        end = Date.parse(end);

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
                console.log('task', task);
                let [taskID] = await db('tasks').insert(task);
                console.log('taskID', taskID);
                taskIDs.push(taskID);

            }
            job.title = JSON.stringify(job.title);
            job.description = JSON.stringify(job.description);
            job.tasks = JSON.stringify(taskIDs);
            job.skills = JSON.stringify(job.skills);
            console.log('job', job);
            let [jobID] = await db('jobs').insert(job);
            console.log('jobID', jobID);
            jobIDs.push(jobID);

        }
        jobs = JSON.stringify(jobIDs);

        // Verify admins
        admins = JSON.stringify(admins.filter(adminID => typeof adminID === 'number'));

        
        // Insert event
        await db('events').insert({
            start: start.toLocaleString(),
            end: end.toLocaleString(),
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