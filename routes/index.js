'use strict';

var express = require('express'),
    User = require('../models/user'),
    Resource = require('../models/resource');

var router = express.Router();

// return a list of all tags present in the database
router.get('/tags', function (req, res) {
  Resource.find({ timestamp: { $ne: null } }).select('-_id tags').exec(function (err, resources) {
    var tags = resources.reduce(function (tags, resource) {
      if (resource.tags) {
        resource.tags.forEach(function (tag) {
          return tags.add(tag);
        });
      }
      return tags;
    }, new Set());
    console.log('tags before 21',tags);
    res.send(Array.from(tags));
  });
});

router.get('/forgotPassword', function (req, res) {
  res.render('forgotPassword');
});

router.get('/resetPassword/:token', function (req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
    if (!user) return res.redirect('/forgotPassword');
    res.render('resetPassword');
  });
});

module.exports = router;
