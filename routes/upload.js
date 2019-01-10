function uploadafile(req, res) {
    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('Nofiles were uploades.');
    }
    let sampleFile = req.files.sampleFile;
    console.log(sampleFile.name);
    sampleFile.mv(__dirname + '/../uploadfile/' + sampleFile.name, err => {
        if (err)
            return res.status(500).send(err);
        res.render('name', {
            status: 'Success',
            name: sampleFile.name
        })
    });
}

exports.uploadafile = uploadafile;