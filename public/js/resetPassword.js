'use strict';

$(document).ready(function() {
  let canSubmit = false;
  $("#password, #password2").keyup(validate);
  $('#sendForm').submit(resetPassword);


function validate (){
  let password = $("#password").val();
  let password2 = $("#password2").val();

    if(password == password2) {
       $("#alertSucess").show().text("Passwords Match");
       $("#alertWarning").hide();
       $("#saveButton").prop("disabled", false);
       canSubmit = true;
    }
    else {
      $("#alertSucess").hide();
      $("#alertWarning").show().text("Passwords do not match");
      $("#saveButton").prop("disabled", true);
      canSubmit = false;
    }

}

function resetPassword(event) {
event.preventDefault();
 if(canSubmit){
   let password = $("#password").val();
   let token = window.location.href.split('/')[4]
   console.log(token);
    $.post(`/users/reset/${token}`, {password : password })
    .done(function (resp) {
       $("#alertSucess").show().text("Changed Successfully");
       $("#alertSucess").append('<p><a href="/">Return to StartCoding.org!</a></p>')
       $("#saveButton").prop("disabled", true);
    })
    .fail(function (err) {
      $("#alertWarning").show().text("Please try again and check your connection.");
    })
    .always(function () {
      $("#password").val('');
      $("#password2").val('');
    })

 }else{
  ("#alertWarning").show().text("How did you do that?");
 }

}

});
