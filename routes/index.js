'use strict';

const express  = require('express')
    , User     = require('../models/user')
    , Resource = require('../models/resource');

let router = express.Router();

// return a list of all tags present in the database
router.get('/tags', (req, res) => {
  Resource.find({ timestamp: { $ne: null } })
  .select('-_id tags')
  .exec((err, resources) => {
    let tags = resources.reduce((tags, resource) => {
      if (resource.tags) {
        resource.tags.forEach(tag => tags.add(tag));
      }
      return tags;
    }, new Set());

    res.send(Array.from(tags));
  });
});

router.get('/forgotPassword', (req, res) => {
  res.render('forgotPassword');
});

router.get('/resetPassword/:token', (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
    if (!user) return res.redirect('/forgotPassword');
    res.render('resetPassword');
  });
});

module.exports = router;
