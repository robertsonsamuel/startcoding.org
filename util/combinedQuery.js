'use strict';

const User     = require('../models/user')
    , Resource = require('../models/resource')
    , Comment  = require('../models/comment');


String.prototype.normalize = function() {
  return this.replace(/\W/g, '').toLowerCase();
}

module.exports = {

  createNewResource: (newResource, userId, cb) => {
    newResource.category = (newResource.category || '').normalize();
    if (!newResource.category) newResource.category = "general";
    if (newResource.tags) newResource.tags = newResource.tags.map(tag => tag.normalize());
    newResource.user = userId;
    Resource.create(newResource, (err, savedResource) => {
      if (err || !savedResource) return cb(err);
      savedResource.populate({ path: 'user', select: 'username' }, (err, savedResource) => {
        err ? cb(err) : cb(null, savedResource);
      });
      User.findByIdAndUpdate(userId, { $push: { savedResources: savedResource._id } }, (err) => {
        if (err) console.log('ERROR SAVING RESOURCE:', err);
      });
    });
  },

  saveResource: (resourceId, userId, cb) => {
    // validate the existence of resource
    let findResource = new Promise((resolve, reject) => {
      Resource.findById(resourceId, (err, resource) => {
        if (err || !resource) return reject(err || "no resource found");
        resolve(resource);
      });
    });

    let findUser = new Promise((resolve, reject) => {
      User.findById(userId, (err, user) => {
        if (err || !user) return reject(err || "no user found");
        resolve(user);
      });
    });

    Promise.all([findResource, findUser])
      .then((resourceAndUser) => {
        let user = resourceAndUser[1];
        let saveIndex = user.savedResources.indexOf(resourceId);
        if (saveIndex === -1) {
          user.savedResources.push(resourceId);
        } else {
          user.savedResources.splice(saveIndex, 1);
        }
        user.save( (err) => {
          if (err) return cb(err);
          cb(null, user)
        })
      }, (err) => {
        console.log("error saving resource to user", err);
        cb("error saving resource to user")
      })
  },

  fullResource: (resourceId, cb) => {
    let findResource = new Promise((resolve, reject) => {
      Resource.findById(resourceId)
        .populate({ path: 'user', select: 'username _id'})
        .exec((err, resource) => {
          if (err || !resource) return reject(err || "no resource found");
          resolve(resource);
        });
    });

    let findComments = new Promise((resolve, reject) => {
      Comment.find({'root' : resourceId })
        .sort({'timestamp': -1})
        .lean()
        .populate({ path: 'user', select: 'username _id'}).exec((err, comments) => {
          if (err) return reject(err);
          resolve( Comment.treeify(comments) );
        });
    });

    Promise.all([findComments, findResource])
      .then((commentsAndResource) => {
        let resp = {
          comments: commentsAndResource[0],
          resource: commentsAndResource[1]
        }
        cb(null, resp)
      }, (err) => {
        console.log("error getting full resource", err);
        cb("error getting full resource");
      })
  }

}
