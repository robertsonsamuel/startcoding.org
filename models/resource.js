'use strict';

const NUM_TO_RETURN = 50; // used in the 'condition' method

const mongoose = require('mongoose')
    , User     = require('./user');

let Resource;


let resourceSchema = mongoose.Schema({
  title: { type: String, required: true },
  link: { type: String, required: true},
  body: { type: String, default: "" },
  category: { type: String, default: "general" },
  user: { type: mongoose.Schema.Types.ObjectId , ref: 'User', required: true },
  timestamp: { type : Date, default: Date.now },
  editTime: { type : Date, default: null },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  tags: { type: [{ type: String }], default: [] }
  // CONVENTION: categories and tags should be lowercase and contain only letters
});


String.prototype.escapeRegExp = function() {
  return this.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// filterResources: retrieves resources within a given category that
//   - match all given tags,
//   - have a title or tag that contains the given query, and
//   - have not been deleted
resourceSchema.statics.filterResources = (req, cb) => {
  let filter = (req.params.category.toLowerCase() === 'all') ? {} : { category: req.params.category.toLowerCase() };

  if (req.query.tags) {
    let tags = req.query.tags.split(',').map(tag => {
      return { tags: tag };
    });
    filter['$and'] = tags;
  }

  if (req.query.query) {
    let re = new RegExp(req.query.query.escapeRegExp(), 'i');
    filter['$or'] = [ { title: re }, { tags: re } ]; // this can be extended to include body, if desired
  }

  filter.timestamp = { $ne: null };

  Resource.find(filter)
  .sort({ 'timestamp': -1 })
  .lean()
  .populate({ path: 'user', select: 'username _id' }).exec((err, resources) => {
    return err ? cb(err) : cb(null, resources);
  });
};


// condition: takes an array of resources and returns an object with properties
//   tags - an object of all unique tags on the resources with frequency counts
//   resources - the resources modified with a score and sorted by that score
resourceSchema.statics.condition = (resources, newest) => {
  let tags = resources.reduce((tags, resource) => {
    if (resource.tags) {
      resource.tags.forEach(tag => {
        tags[tag] = tags[tag] ? tags[tag] + 1 : 1;
      });
    }
    return tags;
  }, {});

  let conditioned = resources.map((resource) => {
    // you can adjust the score calculation here
    resource.score = resource.upvotes - resource.downvotes;
    return resource;
  });

  if (!newest) {
    conditioned.sort((resourceA, resourceB) => {
      return resourceB.score - resourceA.score;
    });
  }

  return {
    tags: tags,
    resources: conditioned.slice(0, NUM_TO_RETURN)
  };
}


resourceSchema.statics.editResource = (req, cb) => {
  let resourceUpdate = req.body
    , updateId       = req.params.resourceId
    , userId         = req.userId;

  let errMsg = "error updating resource";
  Resource.findOne({ _id: updateId, user: userId, timestamp: { $ne: null } }, (err, foundResource) => {
    if (err || !foundResource) return cb(err || errMsg);
    foundResource.body = req.body.body;
    foundResource.editTime = Date.now();
    foundResource.save( err => {
      if (err) return cb(err);
      foundResource.populate('user', (err, user) => {
        if (err) return cb(err);
        return cb(null, foundResource);
      })
    })
  })
};


resourceSchema.statics.deleteResource = (req, cb) => {
  let updateId = req.params.resourceId
    , userId   = req.userId;

  let errMsg = "error deleteing resource";
  Resource.findOne({ _id: updateId, user: userId, timestamp: { $ne: null } }, (err, foundResource) => {
    if (err || !foundResource) return cb(err || errMsg);
    foundResource.title += ' [deleted]';
    foundResource.editTime = null;
    foundResource.timestamp = null;
    foundResource.save( err => {
      if (err) return cb(err);
      return cb(null, foundResource);
    })
  })
};


resourceSchema.statics.vote = (req, cb) => {
  let findResource = new Promise((resolve, reject) => {
    Resource.findById(req.params.resourceId, (err, resource) => {
      if (err || !resource) return reject(err || "no resource found");
      resolve(resource);
    });
  });

  let findUser = new Promise((resolve, reject) => {
    User.findById(req.userId, (err, user) => {
      if (err || !user) return reject(err || "no user found");
      resolve(user);
    });
  });

  Promise.all([findResource, findUser]).then( applyVote, (err) => {
    cb(err);
  });

  function applyVote(resourceAndUserArr) {
    let foundResource = resourceAndUserArr[0];
    let foundUser = resourceAndUserArr[1];
    let vote = req.body.vote

    let upIndex = foundUser.upvotes.indexOf(foundResource._id);
    if (upIndex === -1) upIndex = Infinity;
    let downIndex = foundUser.downvotes.indexOf(foundResource._id);
    if (downIndex === -1) downIndex = Infinity;

    let downInc = 0;
    let upInc = 0;

    if (vote === 'up'){
      if (upIndex === Infinity) {
        // the user has no upvote for this resource
        upInc++;
        foundUser.upvotes.push(foundResource._id);
        downInc -= foundUser.downvotes.splice(downIndex, 1).length;
      } else {
        // the user has an upvote for this resource;
        upInc--;
        foundUser.upvotes.splice(upIndex,1);
      }
    } else if (vote ==='down') {
      if (downIndex === Infinity) {
        // the user has no downvote for this resource
        downInc++;
        foundUser.downvotes.push(foundResource._id);
        upInc -= foundUser.upvotes.splice(upIndex, 1).length;
      } else {
        // the user has a downvote for this resource;
        downInc--;
        foundUser.downvotes.splice(downIndex,1);
      }
    } else {
      return cb("invalid vote");
    }

    let saveUser = new Promise( (resolve, reject) => {
      foundUser.save( (err, savedUser) => {
        if (err) return reject(err);
        resolve(savedUser);
      })
    })

    let updateResource = new Promise( (resolve, reject) => {
      let increments =  { $inc: { upvotes: upInc, downvotes: downInc } };
      Resource.findByIdAndUpdate(foundResource._id, increments, (err, updatedResource) => {
        if (err) return reject(err);
        resolve(updatedResource);
      })
    })

    Promise.all([updateResource, saveUser]).then( (resourceAndUserArr) => {
      return cb(null, resourceAndUserArr[1]);
    }, (err) => {
      return cb(err);
    })
  }
};


// VALIDATORS
resourceSchema.path('user').validate(function (value, respond) {
  User.findById({_id: value}, function (err, foundUser) {
    respond( !err && !!foundUser );
  });
}, 'Error validating resource user');

Resource = mongoose.model('Resource', resourceSchema);
module.exports = Resource;
