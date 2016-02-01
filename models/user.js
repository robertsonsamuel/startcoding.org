'use strict';

const mongoose = require('mongoose')
    , jwt      = require('jwt-simple')
    , bcrypt   = require('bcryptjs')
    , crypto   = require('crypto')
    , async    = require('async')
    , moment   = require('moment')
    , CONFIG   = require('../util/auth-config')
    , api_key  = process.env.MAILGUN_KEY
    , domain   = process.env.MAILGUN_DOMAIN
    , mailgun  = require('mailgun-js')({apiKey: api_key, domain: domain})

let User;


let userSchema = mongoose.Schema({
  username: {type: String, required: true, unique: true},
  password: {type: String, required: true, select: false},
  email: {type: String, select: false},
  resetPasswordToken: {type: String, select: false },
  resetPasswordExpires: {type: Date , select: false },
  upvotes: {type: [{ type: mongoose.Schema.Types.ObjectId }], default: [] },
  downvotes: {type: [{ type: mongoose.Schema.Types.ObjectId }], default: [] },
  savedResources: {type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }], default: [] }
});


userSchema.methods.token = function() {
  let payload = {
    id: this._id,
    iat: moment().unix(),
    exp: moment().add(CONFIG.expTime.num, CONFIG.expTime.unit).unix(),
    username: this.username,
  };
  return jwt.encode(payload, process.env.JWT_SECRET);
};


userSchema.statics.login = function(userInfo, cb) {
  // look for user in database
  User.findOne({username: userInfo.username}).select('+password').exec((err, foundUser) => {
    if (err) return cb('Server Error');
    if (!foundUser) return cb('Incorrect username or password.');
    bcrypt.compare(userInfo.password, foundUser.password, (err, isGood) => {
      if (err) return cb('Server Error');
      if (isGood) {
        let token = foundUser.token()
        foundUser = foundUser.toObject();
        delete foundUser.password;
        console.log("Returning saved user", foundUser);
        return cb(err, token );
      } else {
        return cb('Incorrect username or password.');
      }
    });
  });
}


userSchema.statics.register = function(userInfo, cb) {
  let username  = userInfo.username
    , email     = userInfo.email
    , password  = userInfo.password
    , password2 = userInfo.password2;

  // compare passwords
  if (password !== password2) {
    return cb("Passwords don't match.");
  }

  // validate password
  if (!CONFIG.validatePassword(password)) {
    return cb('Invalid password.');
  }

  // validate username
  if (!CONFIG.validateUsername(username)) {
    return cb('Invalid username.');
  }

  // create user model
  let newUserQuery = email ? { $or: [{email: email}, {username: username}] } : {username: username};
  User.findOne(newUserQuery).select('+email').exec((err, user) => {
    if (err) return cb('Error registering username.');
    if (user) {
      if (username === user.username) return cb('Username taken.');
      if (email === user.email) return cb('Email taken.');
    }
    bcrypt.genSalt(CONFIG.saltRounds, (err, salt) => {
      if (err) return cb(err);
      bcrypt.hash(password, salt, (err, hashedPassword) => {
        if (err) return cb(err);
        let newUser = new User({
          username: username,
          email: email,
          password: hashedPassword
        });
        console.log("new USER", newUser);

        newUser.save((err, savedUser) => {
          if(err || !savedUser) return cb('Username or email already taken.');
          if(savedUser.email){
             let emailData = {
                from: 'welcome@startcoding.com',
                to: savedUser.email,
                subject: 'Welcome To StartCoding.org!',
                text: 'Hello there '+ savedUser.username + '! Congratulations on joining StartCoding.org!\n\n' +
                      'You are joining an awesome website of user driven content, anonymous and safe! Click the link below to get started!\n\n' +
                      'http://robertsonsamuel.github.io/startcoding-frontend/\n\n'
             };
             mailgun.messages().send(emailData, function (err, body) {
               console.log("mailgun Error", err);
              cb(err);
            });
           }

          let token = savedUser.token()
          savedUser = savedUser.toObject();
          delete savedUser.password;
          console.log("returning saved user", savedUser);
          return cb(err, token );
        })
      });
    });
  });
};


userSchema.statics.recovery = function(req, cb){
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        let token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          return  cb('No account with that email address exists.', null);
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          if(err) console.log('error saving',err);
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      let emailData = {
        from: 'passwordreset@startcoding.com',
        to: req.body.email,
        subject: 'StartCoding.org Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
              'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
              'http://' + req.headers.host + '/resetPassword/' + token + '\n\n' +
              'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      mailgun.messages().send(emailData, function (err, body) {
        console.log("mailgun Error", err);
        done(err, 'Email Sent, check your inbox!');
      });
    }
  ], function(err , message) {
    if(err) console.log(err);
    if (err) return cb('There was an error requesting a password reset.');
    if(message) return cb(null, message)
  });
}


userSchema.statics.reset = function(req, cb){
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } })
      .select('+email')
      .exec( (err, user) => {
        if (err || !user) console.log( "error finding user to reset!" ,err || "no user!");
        if (err || !user) return cb('Password reset token is invalid or has expired.', null);
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        bcrypt.genSalt(CONFIG.saltRounds, (err, salt) => {
          if (err) return cb(err, null);
          bcrypt.hash(user.password, salt, (err, hashedPassword) => {
            if (err) return cb(err, null);
              user.password = hashedPassword;

            user.save( (err, savedUser) => {
              if(err) return cb(err, null)
                done(err, user);
            });
          });
        });
      });
    },
    function(user, done) {
      let emailData = {
        from: 'passwordreset@startcoding.com',
        to: user.email,
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
              'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      mailgun.messages().send(emailData, function (err, body) {
        done(err, 'Success! Your email has been sent!');
      });
    }
  ], function(err, message) {
    console.log(err);
    if(err) return cb("Something wierd happened. Try your new password.")
    if(message) return cb(null, message)
  });
}


User = mongoose.model('User', userSchema);
module.exports = User;
