require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var session = require('express-session');
var passport = require('passport');

// モデルの読み込み
var User = require('./models/user');
var Schedule = require('./models/schedule');
var Availability = require('./models/availability');
User.sync().then(() => {
  Availability.belongsTo(User, { foreignKey: 'userId' });
  Schedule.belongsTo(User, { foreignKey: 'createdBy' });
  Schedule.sync().then(() => {
    Availability.belongsTo(Schedule, { foreignKey: 'scheduleId' });
    Availability.sync();
  });
});

//GitHub認証
var GitHubStrategy = require('passport-github2').Strategy;

var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: process.env.HEROKU_URL ? process.env.HEROKU_URL + 'auth/github/callback' : 'http://localhost:8000/auth/github/callback'
},
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      // console.log(`profileは${profile}です。`);
      User.upsert({
        userId: profile.id,
        username: profile.username,
        mailAddress: profile.emails[0].value
      }).then(() => {
        done(null, profile);
      });
    });
  }
));

//Google認証
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
var GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.HEROKU_URL ? process.env.HEROKU_URL + 'auth/google/callback' : 'http://localhost:8000/auth/google/callback'
},
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      // console.log(`profileは${profile}です。`);
      // console.log(`メアドは${profile.emails[0].value}です。`);
      // console.log(`usernameは${profile.displayName}です。`);
      User.upsert({
        userId: profile.id,
        username: profile.displayName,
        mailAddress: profile.emails[0].value
      }).then(() => {
        done(null, profile);
      });
    });
  }
));

var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var schedulesRouter = require('./routes/schedules').router;
var availabilitiesRouter = require('./routes/availabilities');

var app = express();
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: process.env.EXPRESS_SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/schedules', schedulesRouter);
app.use('/schedules', availabilitiesRouter);

app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  function (req, res) {
  });

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res) {
    var loginFrom = req.cookies.loginFrom;
    // オープンリダイレクタ脆弱性対策
    if (loginFrom &&
      !loginFrom.includes('http://') &&
      !loginFrom.includes('https://')) {
      res.clearCookie('loginFrom');
      res.redirect(loginFrom);
    } else {
      res.redirect('/');
    }
  });

app.get('/auth/google',
  passport.authenticate('google', {
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  }),
  function (req, res) {
  });

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    var loginFrom = req.cookies.loginFrom;
    // オープンリダイレクタ脆弱性対策
    if (loginFrom &&
      !loginFrom.includes('http://') &&
      !loginFrom.includes('https://')) {
      res.clearCookie('loginFrom');
      res.redirect(loginFrom);
    } else {
      res.redirect('/');
    }
  });

app.get('/login', function (req, res) {
  res.render('login');
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;