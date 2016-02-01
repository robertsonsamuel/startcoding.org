'use strict';

const express        = require('express')
    , Resource       = require('../models/resource')
    , Comment        = require('../models/comment')
    , authMiddleware = require('../util/auth-middleware')
    , combinedQuery  = require('../util/combinedQuery');

let router = express.Router();

// takes a url like /resources/javascript?tags=tag1,tag2,tag3&query=string&newest=true
router.get('/:category', (req, res) => {
  Resource.filterResources(req, (err, resources) => {
    let newest = req.query && (req.query.newest === 'true');
    res.status(err ? 400 : 200).send(err || Resource.condition(resources, newest));
  });
});

router.get('/one/:id', (req, res) => {
  combinedQuery.fullResource(req.params.id, (err, fullResource) => {
    res.status(err ? 400 : 200).send(err || fullResource);
  });
});

router.post('/', authMiddleware, (req, res) => {
  combinedQuery.createNewResource(req.body, req.userId, (err, resource) => {
    res.status(err ? 400 : 200).send(err || resource);
  });
});

router.post('/vote/:resourceId', authMiddleware, (req, res) => {
  Resource.vote(req, (err, savedUser) => {
    res.status(err ? 400 : 200).send(err || savedUser);
  });
});

router.put('/:resourceId', authMiddleware, (req, res) => {
  Resource.editResource(req, (err, editedResource) => {
    res.status(err ? 400 : 200).send(err || editedResource);
  });
});

router.delete('/:resourceId', authMiddleware, (req, res) => {
  Resource.deleteResource(req, (err, success) => {
    res.status(err ? 400 : 200).send(err || success);
  });
});

module.exports = router;
