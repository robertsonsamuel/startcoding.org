'use strict';

var User = require('../models/user'),
    Resource = require('../models/resource'),
    Comment = require('../models/comment');

String.prototype.normalize = function () {
  return this.replace(/\W/g, '').toLowerCase();
};

module.exports = {

  createNewResource: function createNewResource(newResource, userId, cb) {
    newResource.category = (newResource.category || '').normalize();
    if (!newResource.category) newResource.category = "general";
    if (newResource.tags) newResource.tags = newResource.tags.map(function (tag) {
      return tag.normalize();
    });
    newResource.user = userId;
    Resource.create(newResource, function (err, savedResource) {
      if (err || !savedResource) return cb(err);
      savedResource.populate({ path: 'user', select: 'username' }, function (err, savedResource) {
        err ? cb(err) : cb(null, savedResource);
      });
      User.findByIdAndUpdate(userId, { $push: { savedResources: savedResource._id } }, function (err) {
        if (err) console.log('ERROR SAVING RESOURCE:', err);
      });
    });
  },

  saveResource: function saveResource(resourceId, userId, cb) {
    // validate the existence of resource
    var findResource = new Promise(function (resolve, reject) {
      Resource.findById(resourceId, function (err, resource) {
        if (err || !resource) return reject(err || "no resource found");
        resolve(resource);
      });
    });

    var findUser = new Promise(function (resolve, reject) {
      User.findById(userId, function (err, user) {
        if (err || !user) return reject(err || "no user found");
        resolve(user);
      });
    });

    Promise.all([findResource, findUser]).then(function (resourceAndUser) {
      var user = resourceAndUser[1];
      var saveIndex = user.savedResources.indexOf(resourceId);
      if (saveIndex === -1) {
        user.savedResources.push(resourceId);
      } else {
        user.savedResources.splice(saveIndex, 1);
      }
      user.save(function (err) {
        if (err) return cb(err);
        cb(null, user);
      });
    }, function (err) {
      console.log("error saving resource to user", err);
      cb("error saving resource to user");
    });
  },

  fullResource: function fullResource(resourceId, cb) {
    var findResource = new Promise(function (resolve, reject) {
      Resource.findById(resourceId).populate({ path: 'user', select: 'username _id' }).exec(function (err, resource) {
        if (err || !resource) return reject(err || "no resource found");
        resolve(resource);
      });
    });

    var findComments = new Promise(function (resolve, reject) {
      Comment.find({ 'root': resourceId }).sort({ 'timestamp': -1 }).lean().populate({ path: 'user', select: 'username _id' }).exec(function (err, comments) {
        if (err) return reject(err);
        resolve(Comment.treeify(comments));
      });
    });

    Promise.all([findComments, findResource]).then(function (commentsAndResource) {
      var resp = {
        comments: commentsAndResource[0],
        resource: commentsAndResource[1]
      };
      cb(null, resp);
    }, function (err) {
      console.log("error getting full resource", err);
      cb("error getting full resource");
    });
  }

};
