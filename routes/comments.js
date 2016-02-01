'use strict';

const express        = require('express')
    , Comment        = require('../models/comment')
    , User           = require('../models/user')
    , authMiddleware = require('../util/auth-middleware');

let router = express.Router();

router.get('/:root', (req, res) => {
  Comment.find({'root' : req.params.root })
  .sort({'timestamp': -1})
  .lean()
  .populate({ path: 'user', select: 'username _id'}).exec((err, comments) => {
    res.status(err ? 400 : 200).send(err || Comment.treeify(comments));
  });
});

router.post('/:parent', authMiddleware, (req, res) => {
  Comment.createNewComment(req, (err, newComment) => {
    res.status(err ? 400 : 200).send(err || newComment);
  });
});

router.put('/:commentId', authMiddleware, (req, res) => {
  Comment.editComment(req, (err, editedComment) => {
    res.status(err ? 400 : 200).send(err || editedComment);
  });
});

router.delete('/:commentId', authMiddleware, (req, res) => {
  Comment.deleteComment(req, (err, success) => {
    res.status(err ? 400 : 200).send(err || success);
  });
});

router.post('/vote/:commentId', authMiddleware, (req, res) => {
  Comment.vote(req, (err, savedUser) => {
    res.status(err ? 400 : 200).send(err || savedUser);
  });
})

module.exports = router;
