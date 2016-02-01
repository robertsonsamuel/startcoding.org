'use strict';

module.exports = {
  expTime: { num: 7, unit: 'days' },
  refreshToken: false,
  saltRounds: 10,
  validatePassword: function validatePassword(password) {
    return true;
  },
  validateUsername: function validateUsername(username) {
    return username.length >= 3;
  }
};
