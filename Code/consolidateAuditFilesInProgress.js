//Consolidate all Audit Data into One file.
//@Author Cory McAn
var AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
//exports.consolidateAudit = function(event, context) {
    var bucket = 'senior-projects-cory';
        //event.Records[0].s3.bucket.name;
    var consolidatedBuffer = new Buffer(10000);
    var previousFileLength = 0;
    var fileListLen = 0;
    var consolidatedString;
    var currentFilename;

    s3.listObjects({Bucket: bucket}, haveList);

    function haveList(err, data) {
        console.log('haveList');
        if (err) {
            console.log('error listing objects from bucket ' + bucket);
        }
        else {
            fileListLen = data.Contents.length;
            for (var i = 0; i < fileListLen; i++) {
                    getAllFiles(data.Contents[i].Key);
            }
        }
    }

    function getAllFiles(data) {
        currentFilename = data;
        s3.getObject({Bucket: bucket, Key: data}, gotObj);
    }

    function gotObj(err, data) {
        console.log('appendobjdata');
        if (err) {
            console.log('ERROR OCCURED IN GET OBJ');
            console.log(err, err.stack); // an error occurred
        }
        else {    // successful response
            var currentFileString = data.Body.toString() + '\n';
            var currentStringLen = currentFileString.length;
            //exclude consolidated.json from consolidation if it exists
            if (currentFilename != 'consolidated.json') {
                consolidatedBuffer.write(currentFileString, previousFileLength, currentStringLen, 'utf8');
                previousFileLength = currentStringLen;
                console.log("data written to buffer! Length = " + currentStringLen);
                if (typeof consolidatedString === 'undefined') {
                    consolidatedString = consolidatedBuffer.toString();
                } else {
                    consolidatedString += (consolidatedBuffer.toString());
                }
            }
            s3.upload({
                Bucket: bucket,
                Key: 'consolidated.json',
                Body: consolidatedString
            }, uploaded);
        }
    }


    function uploaded(err) {
        if (err) {
            console.log("upload error!!");
        } else {
            console.log('uploaded consolidated.json successfully!!');
            console.log("consolidated.json contents: \n" + consolidatedString);
        }
    }
   // context.done(null, "done consolidating");


  //
//end