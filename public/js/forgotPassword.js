'use strict';

$(document).ready(function() {

  $('#resetForm').submit((event) => {
    event.preventDefault();
    var email = $('#emailInput').val();

    console.log(email);
    $.post('users/forgot', {email:email})
      .done(resp => {
        console.log(resp);
        $('#emailInput').val('')
        $('#alertSucess').show().text(resp)
      })
      .fail(err => {
        console.log(err);
        $('#alertWarning').show().text(err.responseText);
      })


  });



});
