const dotenv = require('dotenv');
const express = require('express');
const app = express();
var cors = require('cors')
const passport = require('passport');
const bodyparser = require('body-parser');
const cookieparser = require('cookie-parser');

// Init .env
dotenv.config();

// HTTP codes
global.HTTP_OK = 200;
global.HTTP_BAD_REQUEST = 400;
global.HTTP_UNAUTHORIZED = 401;
global.HTTP_FORBIDDEN = 403;
global.HTTP_INTERNAL_ERROR = 500;

// Init body parser, cookie parser, express sessions, and passport
app.use(cors())
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));
app.use(cookieparser());
app.use(require('express-session')({
    secret: Math.random().toString(36).substring(2, 15),
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Init passport authenticate strategy
require('./helpers/passport');

// Setup routes
const index = require('./routes/index');
app.use('/', index);
const users = require('./routes/users');
app.use('/users', users);
const events = require('./routes/events');
app.use('/events', events);
const skills = require('./routes/skills');
app.use('/skills', skills);

// Listen on port
const port = process.env.PORT || 3000;
app.listen(port, _ => console.log(`Server started on port ${port}`));