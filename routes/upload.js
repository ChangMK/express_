var fs = require('fs');

function uploadafile(req, res) {
    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('Nofiles were uploades.');
    }
    let sampleFile = req.files.sampleFile;
    var tsData = '';
    var buf = [];
    var i = 0;
    sampleFile.mv(__dirname + '/../uploadfile/' + sampleFile.name, err => {
        if (err)
            return res.status(500).send(err);
        var rs = fs.createReadStream(__dirname + '/../uploadfile/' + sampleFile.name, {
            encoding: 'hex'
        });
        rs.on('data', function (data) {
            tsData += data;
        });
        rs.on('end', function () {
            for (let i = 0; i < tsData.length; i += 2) {
                buf.push(tsData.slice(i, i + 2));
            }
            console.log(buf[0], buf[1]);
        });
        res.render('name', {
            status: 'Success',
            name: sampleFile.name
        })
    });
}

exports.uploadafile = uploadafile;