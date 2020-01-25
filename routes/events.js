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

    let { id } = req.params; //selected event id

    try {
        //comparing event ids
        let event = await db('events').select().where('id', id).first();

        if (utils.isNullOrUndefined(event))
            return res.json({ error: 'No such event.' });

        //Arrays to be read
        event.jobs = JSON.parse(event.jobs);

        //selecting queries
        let jobsQuery = db('jobs').select();
        let skillsQuery = db('skills').select();
        let tasksQuery = db('tasks').select();
        
        event.jobs.forEach(jobID => jobsQuery.where('id', jobID));
        event.jobs = await jobsQuery;

        event.jobs.forEach(job => { 
            job.tasks = JSON.parse(job.tasks);
            job.skills = JSON.parse(job.skills);

            for(let i in job.tasks) {
                if(i === 0) {
                    tasksQuery.where('id', job.tasks[i]);
                } else {
                    tasksQuery.orWhere(`id`, job.tasks[i]);
                }
            }

            for(let i in job.skills) {
                if(i === 0) {
                    skillsQuery.where('id', job.skills[i]);
                } else {
                    skillsQuery.orWhere(`id`, job.skills[i]);
                }
            }
        });

        console.log(tasksQuery.toString());

        let tasks = await tasksQuery;
        let skills = await skillsQuery;

        event.jobs.forEach(job => {
            for(let i in job.tasks)
                job.tasks[i] = tasks.find(t => t.id === job.tasks[i]);

            for(let i in job.skills)
                job.skills[i] = skills.find(s => s.id === job.skills[i]);
                
            job.tasks = job.tasks.filter(t => !utils.isNullOrUndefined(t));
            job.skills = job.skills.filter(s => !utils.isNullOrUndefined(s));
        });

        event.jobs = event.jobs.filter(j => !utils.isNullOrUndefined(j));

        res.json(event);

    } catch (err) {
        sendError(res, err);
    }

});




module.exports = router;