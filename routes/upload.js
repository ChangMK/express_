const fs = require('fs');
let bufStrings = new Array();
let videoPes = new Array();
let videoPesIFramBufStrings = new Array();
let videoPesBFramBufStrings = new Array();
let videoPesPFramBufStrings = new Array();
let AudioPesBufStrings = new Array();
let bufString = new Array();
const syncByte = '47';
const frameTypeI = '001';
const frameTypeP = '010';
const frameTypeB = '011';
const frameTypeD = '100';

let i = 0;



let patSectionLength;
let TSID;
let programNumber;
let pmtId;
let pmtSectionLength;
let pcrPid;
let videoPid;
let audioPid;
let videoPidForAna = '';
let audioPidForAna = '';
let totalPacketLength = 0;
let gvideoCount = 0;
let gaudioCount = 0;
let gpatCount = 0;
let gpmtCount = 0;
let gnullCount = 0;
let gzeroCount = 0;
let theRatio = 0;

function findpat(res) {
    let index = 0;
    let patFind = false;
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
            res.render('error', {
                message: "Can't find PAT"
            });
        }

    }
    patFind = false;
}

function findpmt(res) {
    let index = 0;
    let pmtFind = false;
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
            res.render('error', {
                message: "Can't find PMT"
            });
            // throw new Error("Can't find PMT");
        }
    }
}

function analyzeEachPidCount() {
    let videoCount = 0;
    let audioCount = 0;
    let patCount = 0;
    let pmtCount = 0;
    let nullCount = 0;
    let count = bufStrings.length;
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
            videoPidForAna = bufString[1] + bufString[2];
        }
        if (tmpId == audioPid) {
            audioCount++;
            audiooPidForAna = bufString[1] + bufString[2]
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
}

function picturetype(length) {
    let x = parseInt(bufStrings[count].substr(36 + length, 2), 16).toString(2);
    let pictureType = prefixbinary(x, 8).substr(2, 3);
    if (pictureType == frameTypeI) {
        return 'I';
    } else if (pictureType == frameTypeB) {
        return 'B';
    } else if (pictureType == frameTypeP) {
        return 'P';
    } else if (pictureType == frameTypeD) {
        return 'D';
    }
}

function analyzeVideoCount() {
    let addPayloadUnitIndicator;
    let FixedAddPayloadUnitIndicator;
    let videoPesRexdex;
    let videoPesAdaptationRexdex;
    let videoZeroPaddingRexdex;
    let zeroCount = 0;
    let count = 0;

    videoZeroPaddingRexdex = RegExp(syncByte + videoPidForAna + '\\w{2}(?:00{184})');
    addPayloadUnitIndicator = (parseInt(videoPidForAna, 16) + 16384).toString(2);
    FixedAddPayloadUnitIndicator = parseInt(prefixbinary(addPayloadUnitIndicator, 16), 2).toString(16);
    videoPesRexdex = RegExp(syncByte + FixedAddPayloadUnitIndicator + '\\w{2}000001e\\w');
    videoPesAdaptationRexdex = RegExp(syncByte + FixedAddPayloadUnitIndicator + '\\w{2}0120000001e\\w');

    while (bufStrings.length - count) {
        let videoPesObject = {};
        if (bufStrings[count].search(videoZeroPaddingRexdex) == 0) {
            zeroCount++;
        }
        if (bufStrings[count].search(videoPesRexdex) == 0) {
            let pesHeaderDataLength;
            videoPesBufStrings = bufStrings[count];
            videoPesObject.count = count;
            videoPesObject.packet = bufStrings[count];
            pesHeaderDataLength = parseInt(bufStrings[count].substr(24, 2)) * 2;
            videoPesObject.pictype = picturetype(pesHeaderDataLength);


            // if (bufStrings[count].substr(24, 2) == '0a') {
            //     let x = parseInt(bufStrings[count].substr(56, 2), 16).toString(2);
            //     let pictureType = prefixbinary(x, 8).substr(2, 3);
            //     switch (pictureType) {
            //         case frameTypeI:
            //             videoPesObject.pictype = 'I';
            //             break;
            //         case frameTypeB:
            //             videoPesObject.pictype = 'B';
            //             break;
            //         case frameTypeP:
            //             videoPesObject.pictype = 'P';
            //             break;
            //         case frameTypeD:
            //             videoPesObject.pictype = 'D';
            //             break;
            //         default:
            //             console.error('picture type error');
            //             break;

            //     }
            // }
            // if (bufStrings[count].substr(24, 2) == '05') {
            //     let x = parseInt(bufStrings[count].substr(46, 2), 16).toString(2);
            //     let pictureType = prefixbinary(x, 8).substr(2, 3);
            //     console.log('\n');
            //     console.log(bufStrings[count]);
            //     console.log(bufStrings[count].substr(46, 2));
            //     console.log(x);
            //     console.log(pictureType);
            //     switch (pictureType) {
            //         case frameTypeI:
            //             videoPesObject.pictype = 'I';
            //             break;
            //         case frameTypeB:
            //             videoPesObject.pictype = 'B';
            //             break;
            //         case frameTypeP:
            //             videoPesObject.pictype = 'P';
            //             break;
            //         case frameTypeD:
            //             videoPesObject.pictype = 'D';
            //             break;
            //         default:
            //             console.error('picture type error');
            //             break;

            //     }
            // }
            videoPes.push(videoPesObject);
            // if (bufStrings[count].search(videoPesAdaptationRexdex) == 0) {
            //     videoPesBufStrings = bufStrings[count];
            //     videoPesObject.count = count;
            //     videoPesObject// if (bufStr.packet = bufStrings[count];
            //     videoPes.push(videoPesObject);
            //     //console.log(bufStrings[count].substr(46, 2));
        }
        count++
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
        var curPath = __dirname + '/../uploadfile/' + sampleFile.name;
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
            findpat(res);
            findpmt(res);
            analyzeEachPidCount();
            analyzeVideoCount();
            theRatio = ((gzeroCount / gvideoCount) * 100).toFixed(3) + '%';


        });

        // rs.on('error', function (error) {
        //     console.error('Error:', error.message);
        // });
        rs.on('close', function (error) {
            bufStrings.length = 0;
            videoPes.length = 0;
            fs.unlinkSync(curPath);
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