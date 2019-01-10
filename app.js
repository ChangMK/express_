var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fileUpload = require('express-fileupload');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var tsParseRouter = require('./routes/tsparse');
var favicon = require('serve-favicon');
var uploadfile = require('./routes/upload');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.get('/test', (req, res) => {
  res.type('text/html');
  res.send('<h2>This is a testing.</h2>');
})
app.post('/upload', uploadfile.uploadafile);
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/tsparse', tsParseRouter);
app.use(favicon(__dirname + '/public/images/favicon.ico'));
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