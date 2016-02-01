'use strict';

const express        = require('express')
    , User           = require('../models/user')
    , Resource       = require('../models/resource')
    , authMiddleware = require('../util/auth-middleware')
    , combinedQuery  = require('../util/combinedQuery');


let router = express.Router();

router.get('/:userId', authMiddleware, (req, res) => {
  if (req.params.userId !== req.userId) return res.status(403).send("unauthorized");
  User.findById(req.params.userId, (err, user) => {
    res.status(err ? 400 : 200).send(err || user);
  })
})

router.get('/savedResources/:userId', authMiddleware, (req, res) => {
  if (req.params.userId !== req.userId) return res.status(403).send("unauthorized");
  User.findById(req.userId).populate({
    path: 'savedResources',
    populate: { path: 'user', select: 'username' }
  }).exec((err, user) => {
    res.status(err ? 400 : 200).send(err || user.savedResources);
  })
})

router.post('/saveResource/:resourceId', authMiddleware, (req, res) => {
  combinedQuery.saveResource(req.params.resourceId, req.userId, (err, user) => {
    res.status(err ? 400 : 200).send(err || user.savedResources);
  })
})

router.post('/register', (req, res) => {
  User.register(req.body, (err, token) => {
    res.status(err ? 400 : 200).send(err || token);
  });
});

router.post('/login', (req, res) => {
  User.login(req.body, (err, token) => {
    res.status(err ? 400 : 200).send(err || token);
  });
});

router.post('/forgot', (req, res) => {
  User.recovery(req, (err, message) => {
    res.status(err ? 400 : 200).send(err || message)
  })
});

router.post('/reset/:token', (req, res) => {
  User.reset(req, (err, message) => {
    res.status(err ? 400 : 200).send(err || message)
  })
})

module.exports = router;
