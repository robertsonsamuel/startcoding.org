'use strict';

var exec = require('child_process').execSync;

console.log('seeding database from ./users.json');
exec('mongoimport --db startcoding --collection users --drop --file ./users.json --jsonArray');

console.log('seeding database from ./resourcess.json');
exec('mongoimport --db startcoding --collection resourcess --drop --file ./resourcess.json --jsonArray');

console.log('seeding database from ./comments.json');
exec('mongoimport --db startcoding --collection comments --drop --file ./comments.json --jsonArray');

// token for 'nicholas': eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjU2OWU4ZDg0NGQ1NDU0NDYxZjVhNWNkYSIsImlhdCI6MTQ1MzIzMTQ5MiwiZXhwIjoxNDUzODM2MjkyLCJ1c2VybmFtZSI6Im5pY2hvbGFzIn0.vZg2HdTh_iaXlhoDOay5IXath7oVQkyBeUVzbJre-4w
