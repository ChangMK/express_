var express = require('express');
var router = express.Router();
/* GET home page. */

router.get('/', function (req, res, next) {

    res.render('tsparse', {
        title: 'Express',
        body: 'Welcome'
    });
});


module.exports = router;