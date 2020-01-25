const express = require('express');
const router = express();
const db = require('../helpers/db');
const utils = require('../helpers/utils');
const sendError = require('../helpers/sendError');

router.get('/:id', async (req, res) => {

    if(utils.isEmptyOrNull(req.params, 'id'))
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


module.exports = router;