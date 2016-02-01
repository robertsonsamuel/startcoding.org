'use strict';

var express = require('express'),
    Comment = require('../models/comment'),
    User = require('../models/user'),
    authMiddleware = require('../util/auth-middleware');

var router = express.Router();

router.get('/:root', function (req, res) {
  Comment.find({ 'root': req.params.root }).sort({ 'timestamp': -1 }).lean().populate({ path: 'user', select: 'username _id' }).exec(function (err, comments) {
    res.status(err ? 400 : 200).send(err || Comment.treeify(comments));
  });
});

router.post('/:parent', authMiddleware, function (req, res) {
  Comment.createNewComment(req, function (err, newComment) {
    res.status(err ? 400 : 200).send(err || newComment);
  });
});

router.put('/:commentId', authMiddleware, function (req, res) {
  Comment.editComment(req, function (err, editedComment) {
    res.status(err ? 400 : 200).send(err || editedComment);
  });
});

router['delete']('/:commentId', authMiddleware, function (req, res) {
  Comment.deleteComment(req, function (err, success) {
    res.status(err ? 400 : 200).send(err || success);
  });
});

router.post('/vote/:commentId', authMiddleware, function (req, res) {
  Comment.vote(req, function (err, savedUser) {
    res.status(err ? 400 : 200).send(err || savedUser);
  });
});

module.exports = router;
