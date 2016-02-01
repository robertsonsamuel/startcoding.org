'use strict';

const mongoose = require('mongoose')
    , Resource = require('./resource')
    , User     = require('./user');

let Comment;


let commentSchema = mongoose.Schema({
  body: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId , ref: 'User', required: true },
  root: { type: mongoose.Schema.Types.ObjectId , ref: 'Resource', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId , ref: 'Comment' },
  timestamp: { type : Date, default: Date.now},
  editTime: { type : Date, default: null },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 }
});


function changeCommentCount(resourceId, inc) {
  Resource.findByIdAndUpdate(resourceId, { $inc: { commentCount: inc } }, (err) => {
    if (err) console.log('ERROR INCREMENTING COMMENT COUNT:', err);
  });
};


commentSchema.statics.createNewComment = (req, cb) => {
  let newComment = req.body
    , seed       = req.query.seed
    , params     = req.params
    , userId     = req.userId;

  newComment.user = req.userId;

  if (seed === "true") {
    newComment.root = params.parent;
    Comment.create(newComment, (err, savedComment) => {
      err ? cb(err) : cb(null, savedComment);
      changeCommentCount(savedComment.root, 1);
    });
  } else {
    Comment.findById(params.parent, (err, parentComment) => {
      if (err || !parentComment) return cb(err || "error creating comment");
      newComment.root = parentComment.root;
      newComment.parent = parentComment._id;
      Comment.create(newComment, (err, savedComment) => {
        err ? cb(err) : cb(null, savedComment);
        changeCommentCount(savedComment.root, 1);
      });
    })
  }
};


commentSchema.statics.editComment = (req, cb) => {
  let commentUpdate = req.body
    , updateId      = req.params.commentId
    , userId        = req.userId;

  let errMsg = "error updating comment";
  Comment.findOne({ _id: updateId, user: userId, timestamp: { $ne: null } }, (err, foundComment) => {
    if (err || !foundComment) return cb(err || errMsg);
    foundComment.body = req.body.body;
    foundComment.editTime = Date.now();
    foundComment.save( err => {
      if (err) return cb(err);
      return cb(null, foundComment);
    })
  })
};


commentSchema.statics.deleteComment = (req, cb) => {
  let updateId = req.params.commentId
    , userId   = req.userId;

  let errMsg = "error deleteing comment";
  Comment.findOne({ _id: updateId, user: userId, timestamp: { $ne: null } }, (err, foundComment) => {
    if (err || !foundComment) return cb(err || errMsg);
    foundComment.body = '[deleted]';
    foundComment.editTime = null;
    foundComment.timestamp = null;
    foundComment.save( err => {
      if (err) return cb(err);
      return cb(null, foundComment);
    });
    changeCommentCount(foundComment.root, -1);
  })
};


commentSchema.statics.treeify = (comments) => {
  let childrenDictionary = comments.reduce((childrenDictionary, comment) => {
    comment.score = comment.upvotes - comment.downvotes;

    let parent = comment.parent || 'root';
    if (childrenDictionary[parent]) {
      childrenDictionary[parent].push(comment);
    } else {
      childrenDictionary[parent] = [comment];
    }
    return childrenDictionary;
  }, {});

  function populatePost(post) {
    if (!childrenDictionary[post]) return [];

    childrenDictionary[post].sort((commentA, commentB) => {
      return commentB.score - commentA.score;
    });

    return childrenDictionary[post].map(child => {
      child.children = populatePost(child._id);
      return child;
    })
  }

  return populatePost('root');
};


commentSchema.statics.vote = (req, cb) => {
  let findComment = new Promise((resolve, reject) => {
    Comment.findById(req.params.commentId, (err, comment) => {
      if (err || !comment) return reject(err || "no comment found");
      resolve(comment);
    });
  });

  let findUser = new Promise((resolve, reject) => {
    User.findById(req.userId, (err, user) => {
      if (err || !user) return reject(err || "no user found");
      resolve(user);
    });
  });

  Promise.all([findComment, findUser]).then( applyVote, (err) => {
    cb(err);
  });

  function applyVote(commentAndUserArr) {
    let foundComment = commentAndUserArr[0];
    let foundUser = commentAndUserArr[1];
    let vote = req.body.vote

    let upIndex = foundUser.upvotes.indexOf(foundComment._id);
    if (upIndex === -1) upIndex = Infinity;
    let downIndex = foundUser.downvotes.indexOf(foundComment._id);
    if (downIndex === -1) downIndex = Infinity;

    let downInc = 0;
    let upInc = 0;

    if (vote === 'up'){
      if (upIndex === Infinity) {
        // the user has no upvote for this comment
        upInc++;
        foundUser.upvotes.push(foundComment._id);
        downInc -= foundUser.downvotes.splice(downIndex, 1).length;
      } else {
        // the user has an upvote for this comment;
        upInc--;
        foundUser.upvotes.splice(upIndex,1);
      }
    } else if (vote ==='down') {
      if (downIndex === Infinity) {
        // the user has no downvote for this comment
        downInc++;
        foundUser.downvotes.push(foundComment._id);
        upInc -= foundUser.upvotes.splice(upIndex, 1).length;
      } else {
        // the user has a downvote for this comment;
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

    let updateComment = new Promise( (resolve, reject) => {
      let increments =  { $inc: { upvotes: upInc, downvotes: downInc } };
      Comment.findByIdAndUpdate(foundComment._id, increments, (err, updatedComment) => {
        if (err) return reject(err);
        resolve(updatedComment);
      })
    })

    Promise.all([updateComment, saveUser]).then( (commentAndUserArr) => {
      return cb(null, commentAndUserArr[1]);
    }, (err) => {
      return cb(err);
    })
  }
};


// VALIDATORS
commentSchema.path('user').validate(function (value, respond) {
  User.findById({_id: value}, function (err, foundUser) {
    respond(!err && !!foundUser)
  });
}, 'Error validating user');

commentSchema.path('root').validate(function (value, respond) {
  Resource.findById({_id: value}, function (err, foundResource) {
    respond(!err && !!foundResource)
  });
}, 'Error validating root');

commentSchema.path('parent').validate(function (value, respond) {
  Comment.findById({_id: value}, function (err, foundComment) {
    respond(!err && !!foundComment)
  });
}, 'Error validating parent comment');


Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
