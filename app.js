require('dotenv').config();

// // modules
const ejsMate = require('ejs-mate');

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var passport = require('passport');

var SQLiteStore = require('connect-sqlite3')(session);

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');







const app = express()

// route stuff
var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');


// ejs stuff
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// session stuff
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({dir:'/var/data/', db: 'sessions'})
}));

app.use(passport.authenticate('session'));




// routing
app.use('/', indexRouter);
app.use('/', authRouter);


// if link isnt found
app.all('*', (req, res, next) => {
  res.send('404')
})


const port = process.env.PORT || 3000;
// port
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})