'use strict';

var express = require('express'),
    User = require('../models/user'),
    Resource = require('../models/resource'),
    authMiddleware = require('../util/auth-middleware'),
    combinedQuery = require('../util/combinedQuery');

var router = express.Router();

router.get('/:userId', authMiddleware, function (req, res) {
  if (req.params.userId !== req.userId) return res.status(403).send("unauthorized");
  User.findById(req.params.userId, function (err, user) {
    res.status(err ? 400 : 200).send(err || user);
  });
});

router.get('/savedResources/:userId', authMiddleware, function (req, res) {
  if (req.params.userId !== req.userId) return res.status(403).send("unauthorized");
  User.findById(req.userId).populate({
    path: 'savedResources',
    populate: { path: 'user', select: 'username' }
  }).exec(function (err, user) {
    res.status(err ? 400 : 200).send(err || user.savedResources);
  });
});

router.post('/saveResource/:resourceId', authMiddleware, function (req, res) {
  combinedQuery.saveResource(req.params.resourceId, req.userId, function (err, user) {
    res.status(err ? 400 : 200).send(err || user.savedResources);
  });
});

router.post('/register', function (req, res) {
  User.register(req.body, function (err, token) {
    res.status(err ? 400 : 200).send(err || token);
  });
});

router.post('/login', function (req, res) {
  User.login(req.body, function (err, token) {
    res.status(err ? 400 : 200).send(err || token);
  });
});

router.post('/forgot', function (req, res) {
  User.recovery(req, function (err, message) {
    res.status(err ? 400 : 200).send(err || message);
  });
});

router.post('/reset/:token', function (req, res) {
  User.reset(req, function (err, message) {
    res.status(err ? 400 : 200).send(err || message);
  });
});

module.exports = router;
