const fs = require('fs');
let bufStrings = new Array();
let bufString = new Array();
let i = 0;

let patFind = false;
let pmtFind = false;
let patSectionLength;
let TSID;
let programNumber;
let pmtId;
let pmtSectionLength;
let pcrPid;
let videoPid;
let audioPid;
let totalPacketLength = 0;
let gvideoCount = 0;
let gaudioCount = 0;
let gpatCount = 0;
let gpmtCount = 0;
let gnullCount = 0;
let gzeroCount = 0;
let theRatio = 0;

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

function analyzeEachPidCount() {
    let index = 0;
    let videoCount = 0;
    let audioCount = 0;
    let patCount = 0;
    let pmtCount = 0;
    let nullCount = 0;
    let count = bufStrings.length;
    console.log(count);
    while (count--) {
        let tmpId = ''
        bufString.length = 0;
        for (i = 0; i < 8; i += 2) {
            bufString.push(bufStrings[count].slice(i, i + 2));
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
    }
    gvideoCount = videoCount;
    gaudioCount = audioCount;
    gpatCount = patCount;
    gpmtCount = pmtCount;
    gnullCount = nullCount;
    videoCount = 0;
    audioCount = 0;
    patCount = 0;
    pmtCount = 0;
    nullCount = 0;
    console.log(gvideoCount);
    console.log(gaudioCount);
    console.log(gpatCount);
    console.log(gpmtCount);
}

function analyzeVideoPackZeroCount() {
    let index = 0;
    let zeroCount = 0;
    let count = bufStrings.length;
    while (count--) {
        if (bufStrings[count].search(/(?:00){184,}/g) == 8)
            zeroCount++;
    }
    gzeroCount = zeroCount;
    zeroCount = 0;
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
            totalPacketLength = bufStrings.length;
            findpat();
            findpmt();
            console.log(totalPacketLength);
            analyzeEachPidCount();
            analyzeVideoPackZeroCount();
            theRatio = ((gzeroCount / gvideoCount) * 100) + '%';

        });

        // rs.on('error', function (error) {
        //     console.error('Error:', error.message);
        // });
        rs.on('close', function (error) {
            bufStrings.length = 0;
            console.log('Stream has been destroyed and file has been closed');
            res.render('name', {
                status: 'Success',
                name: sampleFile.name,
                PAT_SECTION_LENGTH: patSectionLength,
                PMTID: '0x' + pmtId,
                VPID: '0x' + videoPid,
                APID: '0x' + audioPid,
                TOTALPACKET: totalPacketLength,
                PATPACKET: gpatCount,
                PMTPACKET: gpmtCount,
                VIDEOPACKET: gvideoCount,
                AUDIOPACKET: gaudioCount,
                VIDEOZEROCOUNT: gzeroCount,
                THERATIO: theRatio,
            });

        });
    })
}
exports.uploadafile = uploadafile;