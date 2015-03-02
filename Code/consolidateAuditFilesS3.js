//Consolidate all Audit Data into One file.
//@Author Cory McAn
var AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
//exports.consolidateAudit = function(event, context) {
    var bucket = event.Records[0].s3.bucket.name;

    s3.listObjects({Bucket: bucket}, haveList);

    function haveList(err, data) {
        if (err) {
            console.log('error listing objects from bucket ' + bucket);
        }
        else {
            console.log('haveList');
            var consolidatedBuffer = new Buffer(10000);
            var fileListLen = data.Contents.length;
            var consolidatedString = "";
            var currentFilename;
            var totalBytes = 0;
            var previousFileLength = 0;
            var readObjs = function (index) {
                if (index == fileListLen) {
                    console.log("Done reading files. totalBytes = " + totalBytes);
                    consolidatedString = consolidatedBuffer.toString().substr(0, totalBytes).trim();
                    s3.upload({
                        Bucket: bucket,
                        Key: 'consolidated.json',
                        Body: consolidatedString
                    }, uploaded);
                } else {
                    currentFilename = data.Contents[index].Key;
                    s3.getObject({Bucket: bucket, Key: data.Contents[index].Key}, function (error, data) {
                        if (error) {
                            console.log("Error reading object. ", error);
                        } else {
                            var currentFileString = data.Body.toString().trim() + '\n';
                            var currentStringLen = currentFileString.length;
                            //exclude consolidated.json from consolidation if it exists
                            if (currentFilename != 'consolidated.json') {
                                consolidatedBuffer.write(currentFileString, previousFileLength);
                                previousFileLength += currentStringLen;
                                totalBytes += currentStringLen;
                                readObjs(index + 1);
                            }
                            else {
                                readObjs(index + 1);
                            }
                        }
                    });
                }
            };
            readObjs(0);
        }
        function uploaded(err, data) {
            if (err) {
                console.log("upload error!!");
            } else {
                console.log('uploaded consolidated.json successfully!!');
                context.done(null, "done consolidating, output into " + bucket);
            }
        }
    }
