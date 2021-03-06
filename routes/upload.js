const fs = require('fs');
let fileQueue = new Array();
let bufStrings = [];
// let bufStrings = new Array();
let videoPes = new Array();
let videoPesCount = new Array();
let videoPaddingRatio = new Array();
let videoPesIFrame = [];
let videoPesBFrame = [];
let videoPesPFrame = [];
// let videoPesIFrame = new Array();
// let videoPesBFrame = new Array();
// let videoPesPFrame = new Array();
let videoZeroPaddingPacket = new Array();
let bufString = [];
// let bufString = new Array();
let arrVideoPacket = new Array();
let programNumberTmp = new Array();
let pmtIdTmp = new Array();
const pictureHeader = '00000100';
const zeroPadding = '\\w{2}(?:00{184})';
const pesStartCode = '\\w{2}000001e\\w';
const pesPicStartCode = '\\w{2}0120000001e\\w';
const syncByte = '47';
const frameTypeI = '001';
const frameTypeP = '010';
const frameTypeB = '011';
const frameTypeD = '100';
const numOfCRC32 = 4;
const numBetweenLengthAndPGN = 5;
let i = 0;
let totalRatio = 0;
let averageIRatio = 0;
let averageBRatio = 0;
let averagePRatio = 0;
let programSelected = 1;

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

function debug(p1, p2 = '', p3 = '', ...other) {
    console.log(p1);
    console.log(p2);
    console.log(p3);
    console.log(other);
}

function findpat(res) {
    let index = 0;
    let patFind = false;
    let bufs = [];
    let bufsLength;
    let numberOfPMT = 0;
    let blockNumberOfPMT = 0;
    while (!patFind) {
        let tmpId = '';
        bufString.length = 0;
        bufs = bufStrings[index];
        bufsLength = bufs.length;
        console.log("bufsLength=", bufsLength);
        for (i = 0; i < 376; i += 2) {
            bufString.push(bufStrings[index].slice(i, i + 2));
        }
        index += 1;
        tmpId = getsplitbits(bufString[1], bufString[2], 5);
        if (tmpId == '0000' && bufString[5] == '00') {
            console.log('get PAT');
            console.log('programSelected=' + programSelected);
            patFind = true;
            patSectionLength = parseInt(bufString[7], 16);
            console.log('patSectionLength=' + patSectionLength);
            numberOfPMT = (patSectionLength - numOfCRC32 - numBetweenLengthAndPGN) / 4; // PGN+PMT ID = 4 bytes
            console.log('numberOfPMT=' + numberOfPMT);
            TSID = bufString[8] + bufString[9];
            console.log('TSID:0x' + TSID);
            while (numberOfPMT) {
                blockNumberOfPMT = numberOfPMT * 4;
                programNumberTmp[numberOfPMT] = bufString[blockNumberOfPMT + 9] + bufString[blockNumberOfPMT + 10];
                // PMT ID has 5-bits at bufString[15][4:0]
                pmtIdTmp[numberOfPMT] = getsplitbits(bufString[blockNumberOfPMT + 11], bufString[blockNumberOfPMT + 12], 5);
                numberOfPMT--;
            }
            programNumber = programNumberTmp[programSelected];
            console.log('PGN:0x' + programNumber);
            pmtId = pmtIdTmp[programSelected];
            console.log('PMTID:0x' + pmtId);
        }
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
            if (bufString[17] == '02') // vudeo ID
                videoPid = getsplitbits(bufString[18], bufString[19], 5);
            else if (bufString[17] == '03' || bufString[17] == '81') // audio ID
                audioPid = getsplitbits(bufString[18], bufString[19], 5);

            if (bufString[22] == '03' || bufString[22] == '81') // audio ID
                audioPid = getsplitbits(bufString[23], bufString[24], 5);
            else if (bufString[22] == '02') // vudeo ID
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

function analyzeeachpidcount() {
    let videoCount = 0;
    let audioCount = 0;
    let patCount = 0;
    let pmtCount = 0;
    let nullCount = 0;
    let count = 0;
    while (bufStrings.length - count) {
        let tmpId = ''
        let objVideoPacket = {};
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
            objVideoPacket.count = count;
            objVideoPacket.packet = bufStrings[count];
            arrVideoPacket.push(objVideoPacket);
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
        count++;
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
    count = 0;
}

function picturetype(pictureTypePosition, count) {
    let x = parseInt(bufStrings[count].substr(pictureTypePosition, 2), 16).toString(2);
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

function getPesPacket(count, videoPesObject) {
    let pictureTypePosition;
    videoPesBufStrings = bufStrings[count];
    videoPesObject.count = count;
    videoPesCount.push(count);
    pictureTypePosition = bufStrings[count].search(pictureHeader) + 10;
    videoPesObject.pictype = picturetype(pictureTypePosition, count);
    videoPesObject.packet = bufStrings[count];
    videoPesObject.vcount = 0;
    videoPesObject.zeroCount = 0;
    videoPesObject.zeroRatio = 0;
    videoPes.push(videoPesObject);
}

function analyzevideocount() {
    let addPayloadUnitIndicator;
    let FixedAddPayloadUnitIndicator;
    let videoPesRexdex;
    let videoPesAdaptationRexdex;
    let videoZeroPaddingRexdex;
    let zeroCount = 0;
    let zeroCountA = 0;
    let count = 0;
    let arrIndex = 0;
    let pesIndex = 0;
    let x = 0;
    videoZeroPaddingRexdex = RegExp(syncByte + videoPidForAna + zeroPadding);
    addPayloadUnitIndicator = (parseInt(videoPidForAna, 16) + 16384).toString(2);
    FixedAddPayloadUnitIndicator = parseInt(prefixbinary(addPayloadUnitIndicator, 16), 2).toString(16);
    videoPesRexdex = RegExp(syncByte + FixedAddPayloadUnitIndicator + pesStartCode);
    videoPesAdaptationRexdex = RegExp(syncByte + FixedAddPayloadUnitIndicator + pesPicStartCode);

    while (bufStrings.length - count) {
        let videoPesObject = {};
        if (bufStrings[count].search(videoZeroPaddingRexdex) == 0) {
            zeroCount++;
            videoZeroPaddingPacket.push(count);
        }
        if (bufStrings[count].search(videoPesRexdex) == 0 || bufStrings[count].search(videoPesAdaptationRexdex) == 0) {
            getPesPacket(count, videoPesObject);
        }
        count++;
    }

    for (let index of Object.keys(videoPes)) {
        if (videoPes[index].pictype == 'I') {
            videoPesIFrame.push(videoPes[index]);

        }
        if (videoPes[index].pictype == 'B') {
            videoPesBFrame.push(videoPes[index]);

        }
        if (videoPes[index].pictype == 'P') {
            videoPesPFrame.push(videoPes[index]);
        }
    }

    while (arrVideoPacket.length - arrIndex) {
        let vCount = arrVideoPacket[arrIndex].count;
        let pesCount = videoPes[pesIndex].count;
        if (vCount <= pesCount) {
            if (arrVideoPacket[arrIndex].packet.search(videoZeroPaddingRexdex) == 0) {
                zeroCountA++;
            }
            x++;
        } else {
            delete videoPes[pesIndex].packet;
            if (pesIndex == 0) {
                pesIndex++;
                x = 0;
                zeroCountA = 0;
                continue;
            }
            videoPes[pesIndex - 1].vcount = x;
            videoPes[pesIndex - 1].zeroRatio = ((zeroCountA / x) * 100).toFixed(3);
            videoPes[pesIndex - 1].zeroCount = zeroCountA;
            videoPaddingRatio.push(((zeroCountA / x) * 100).toFixed(3));
            pesIndex++;
            if (videoPes.length <= pesIndex)
                break;

            x = 1;
            zeroCountA = 0;
        }

        arrIndex++;
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

function frameaverageratio() {
    for (let index of Object.keys(videoPesIFrame)) {
        totalRatio = totalRatio + parseInt(videoPesIFrame[index].zeroRatio);
    }
    averageIRatio = (totalRatio / videoPesIFrame.length).toFixed(3) + '%';
    totalRatio = 0;

    for (let index of Object.keys(videoPesBFrame)) {
        totalRatio = totalRatio + parseInt(videoPesBFrame[index].zeroRatio);
    }
    averageBRatio = (totalRatio / videoPesBFrame.length).toFixed(3) + '%';
    totalRatio = 0;

    for (let index of Object.keys(videoPesPFrame)) {
        totalRatio = totalRatio + parseInt(videoPesPFrame[index].zeroRatio);
    }
    averagePRatio = (totalRatio / videoPesPFrame.length).toFixed(3) + '%';
    totalRatio = 0;
}

function uploadafile(req, res) {

    programSelected = req.body.text.charAt(1);
    if (Object.keys(req.files).length == 0) {
        return res.status(400).send('Nofiles were uploades.');
    }
    let sampleFile = req.files.sampleFile;
    let curPath = __dirname + '/../uploadfile/' + sampleFile.name;

    sampleFile.mv(sampleFile.name, err => {
        if (err)
            return res.status(500).send(err);
    });
    /* need to implement mutex */
    // fileQueue.push(curPath);
    // let nowFilePath = fileQueue.reverse().pop();

    var rs = fs.createReadStream(sampleFile.name, {
        encoding: 'hex',
        highWaterMark: 188
    }).on('data', function (data) {
        bufStrings.push(data);

    }).on('end', function () {
        console.log('Read End!');
        totalPacketLength = bufStrings.length;
        findpat(res);
        findpmt(res);
        analyzeeachpidcount();
        analyzevideocount();
        frameaverageratio();
        theRatio = ((gzeroCount / gvideoCount) * 100).toFixed(3) + '%';


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
            TOTALPACKET: totalPacketLength,
            PATPACKET: gpatCount,
            PMTPACKET: gpmtCount,
            VIDEOPACKET: gvideoCount,
            AUDIOPACKET: gaudioCount,
            VIDEOZEROCOUNT: gzeroCount,
            THERATIO: theRatio,
            ALLPICFRAME: JSON.stringify(videoPes),
            IFRAME: JSON.stringify(videoPesIFrame),
            BFRAME: JSON.stringify(videoPesBFrame),
            PFRAME: JSON.stringify(videoPesPFrame),
            VIDEOPESCOUNT: videoPesCount,
            VIDEOPADDINGRATIO: videoPaddingRatio,
            AVERAGEI: averageIRatio,
            AVERAGEB: averageBRatio,
            AVERAGEP: averagePRatio,
        });
        fs.unlinkSync(sampleFile.name);
        bufStrings.length = 0;
        videoPes.length = 0;
        videoZeroPaddingPacket.length = 0;
        arrVideoPacket.length = 0;
        videoPesCount.length = 0;
        videoPaddingRatio.length = 0;
        videoPesIFrame = {};
        videoPesBFrame = {};
        videoPesPFrame = {};
    });
}
exports.uploadafile = uploadafile;