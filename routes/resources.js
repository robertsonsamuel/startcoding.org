'use strict';

var express = require('express'),
    Resource = require('../models/resource'),
    Comment = require('../models/comment'),
    authMiddleware = require('../util/auth-middleware'),
    combinedQuery = require('../util/combinedQuery');

var router = express.Router();

// takes a url like /resources/javascript?tags=tag1,tag2,tag3&query=string&newest=true
router.get('/:category', function (req, res) {
  Resource.filterResources(req, function (err, resources) {
    var newest = req.query && req.query.newest === 'true';
    res.status(err ? 400 : 200).send(err || Resource.condition(resources, newest));
  });
});

router.get('/one/:id', function (req, res) {
  combinedQuery.fullResource(req.params.id, function (err, fullResource) {
    res.status(err ? 400 : 200).send(err || fullResource);
  });
});

router.post('/', authMiddleware, function (req, res) {
  combinedQuery.createNewResource(req.body, req.userId, function (err, resource) {
    res.status(err ? 400 : 200).send(err || resource);
  });
});

router.post('/vote/:resourceId', authMiddleware, function (req, res) {
  Resource.vote(req, function (err, savedUser) {
    res.status(err ? 400 : 200).send(err || savedUser);
  });
});

router.put('/:resourceId', authMiddleware, function (req, res) {
  Resource.editResource(req, function (err, editedResource) {
    res.status(err ? 400 : 200).send(err || editedResource);
  });
});

router['delete']('/:resourceId', authMiddleware, function (req, res) {
  Resource.deleteResource(req, function (err, success) {
    res.status(err ? 400 : 200).send(err || success);
  });
});

module.exports = router;
