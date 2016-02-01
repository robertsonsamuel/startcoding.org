'use strict';

var PORT = process.env.PORT || 3000,
    express = require('express'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    cookieParser = require('cookie-parser'),
    cors = require('cors'),
    compression = require('compression'),
    path = require('path'),
    mongoose = require('mongoose'),
    mongoUrl = process.env.MONGOLAB_URI || 'mongodb://localhost/startcoding';

mongoose.connect(mongoUrl);

var app = express();
var router = express.Router();

// CORS
var whitelist = ['http://robertsonsamuel.github.io'];
var corsOptions = {
  origin: function origin(_origin, callback) {
    var originIsWhitelisted = whitelist.indexOf(_origin) !== -1;
    callback(null, originIsWhitelisted);
  }
};
app.use(cors(corsOptions));

// VIEWS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express['static'](path.join(__dirname, 'public')));
app.use('/', require('./routes/index'));

// GENERAL MIDDLEWARE
app.use(compression());
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// ROUTES
app.use('/users', require('./routes/users'));
app.use('/resources', require('./routes/resources'));
app.use('/comments', require('./routes/comments'));

app.use('/*', router.get('/', function (req, res) {
  res.render('index');
}));

// 404 HANDLER
app.use(function (req, res) {
  res.status(404).send('route not found');
});

// LISTEN
app.listen(PORT, function () {
  console.log('Listening on port ', PORT);
});
