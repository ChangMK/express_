var express = require('express');
var router = express.Router();
var fs = require('fs');
/* GET home page. */

router.get('/', function (req, res, next) {
    res.render('tsparse', {
        title: 'Express',
        body: 'try it'
    });
});


module.exports = router;