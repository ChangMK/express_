var fs = require('fs');
var bufStrings = new Array();
var bufString = new Array();
var i = 0;

var patFind = false;
var pmtFind = false;
var patSectionLength;
var TSID;
var programNumber;
var programMapId;
var pmtSectionLength;
var pcrPid;
var videoPid;
var audioPid;

var videoCount = 0;
var audioCount = 0;
var patCount = 0;
var pmtCount = 0;
var nullCount = 0;

function findpat() {
    let index = 0;
    while (!patFind) {
        let tmpId = ''
        bufString.length = 0;
        for (i = 0; i < bufStrings[index].length; i += 2) {
            bufString.push(bufStrings[index].slice(i, i + 2));
        }
        tmpId = getsplitbits(bufString[1], bufString[2], 5);
        if (tmpId == '0000' && bufString[5] == '00') {
            console.log('get PAT');
            patFind = true;
            patSectionLength = bufString[7];
            TSID = bufString[8] + bufString[9];
            console.log('TSID:0x' + TSID);
            programNumber = bufString[13] + bufString[14];
            console.log('PGN:0x' + programNumber);
            // PMT ID has 5-bits at bufString[15][4:0]
            pmtId = getsplitbits(bufString[15], bufString[16], 5);
            console.log('PMTID:0x' + pmtId);
        }
        index += 1;
        if (index == bufStrings.length) {
            patFind = true;
            throw new Error("Can't find PAT");
        }

    }
}

function findpmt() {
    let index = 0;
    while (!pmtFind) {
        let tmpId = ''
        bufString.length = 0;
        for (i = 0; i < bufStrings[index].length; i += 2) {
            bufString.push(bufStrings[index].slice(i, i + 2));
        }
        tmpId = getsplitbits(bufString[1], bufString[2], 5);
        if (tmpId == pmtId && bufString[5] == '02') {
            console.log('get PMT');
            pmtFind = true;
            pmtSectionLength = getsplitbits(bufString[6], bufString[7], 4);
            console.log('PMT length:' + pmtSectionLength);
            pcrPid = getsplitbits(bufString[13], bufString[14], 5);
            console.log('PCR PID:' + pcrPid);
            if (bufString[17] == '02')
                videoPid = getsplitbits(bufString[18], bufString[19], 5);
            else if (bufString[17] == '03' || bufString[17] == '81')
                audioPid = getsplitbits(bufString[18], bufString[19], 5);

            if (bufString[22] == '03' || bufString[22] == '81')
                audioPid = getsplitbits(bufString[23], bufString[24], 5);
            else if (bufString[22] == '02')
                videoPid = getsplitbits(bufString[23], bufString[24], 5);
            console.log('video PID:' + videoPid);
            console.log('audio PID:' + audioPid);
        }
        index += 1;
        if (index == bufStrings.length) {
            pmtFind = true;
            throw new Error("Can't find PMT");
        }
    }
}

function analyze() {
    let index = 0;

    let count = bufStrings.length;
    console.log(count);
    while (count--) {
        let tmpId = ''
        bufString.length = 0;
        for (i = 0; i < 8; i += 2) {
            bufString.push(bufStrings[index].slice(i, i + 2));
        }

        tmpId = getsplitbits(bufString[1], bufString[2], 5);
        if (tmpId == '0000') {
            patCount++;
        }
        if (tmpId == pmtId) {
            pmtCount++;
        }

        if (tmpId == videoPid) {
            videoCount++;
        }
        if (tmpId == audioPid) {
            audioCount++;
        }
        if (tmpId == '1ffd') {
            nullCount++;
        }
        index += 1;
        // console.log(count);
    }
    console.log(videoCount);
    console.log(audioCount);
    console.log(patCount);
    console.log(pmtCount);
}

function prefixbinary(num, n) {
    return (Array(n).join(0) + num).slice(-n);

}

function getsplitbits(splitNum, joinNum, splitLength) {
    let getBinary;
    let fixedBinary;

    if (splitLength > 8)
        throw new Error('splitLength too long');
    getBinary = parseInt(splitNum, 16).toString(2);
    fixedBinary = prefixbinary(getBinary, 8);
    return prefixbinary(parseInt(fixedBinary.slice((8 - splitLength), 8), 2).toString(16) + joinNum, 4);
}

function uploadafile(req, res) {

    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('Nofiles were uploades.');
    }
    let sampleFile = req.files.sampleFile;

    sampleFile.mv(__dirname + '/../uploadfile/' + sampleFile.name, err => {
        if (err)
            return res.status(500).send(err);
        var rs = fs.createReadStream(__dirname + '/../uploadfile/' + sampleFile.name, {
            encoding: 'hex',
            highWaterMark: 188

        });
        rs.on('data', function (data) {
            bufStrings.push(data);
        });
        rs.on('end', function () {
            console.log('Read End!');
            findpat();
            findpmt();
            console.log(bufStrings.length);
            analyze();

        });

        // rs.on('error', function (error) {
        //     console.error('Error:', error.message);
        // });
        rs.on('close', function (error) {
            console.log('Stream has been destroyed and file has been closed');
            res.render('name', {
                status: 'Success',
                name: sampleFile.name,
                PAT_SECTION_LENGTH: patSectionLength,
                PMTID: '0x' + pmtId,
                VPID: '0x' + videoPid,
                APID: '0x' + audioPid,
                TOTALPACKET: bufStrings.length,
                PATPACKET: patCount,
                PMTPACKET: pmtCount,
                VIDEOPACKET: videoCount,
                AUDIOPACKET: audioCount,
            });

        });
    })
}
exports.uploadafile = uploadafile;