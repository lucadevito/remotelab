const express = require('express');
const router = express.Router();
const experimentService = require('./experiment.service');

// routes
router.get('/', getAll);
router.post('/start', startExperiment);
router.post('/stop', stopExperiment);

module.exports = router;


function getAll(req, res, next) {
    experimentService.getAll()
        .then(experiments => res.json(experiments))
        .catch(next);
}

function startExperiment(req, res, next) {
    experimentService.startExperiment(req.body)
        .then(user => res.json(user))
        .catch(next);
}

function stopExperiment(req, res, next) {
    experimentService.stopExperiment(req.body)
        .then(user => res.json(user))
        .catch(next);
}