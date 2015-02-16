var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';

exports.consolidateAudit = function(event, context) {

var s3 = new AWS.S3({params : { Bucket: 'senior-projects-cory'} });

var listObjParams = {
  Bucket: 'senior-projects-cory',
  EncodingType: 'url',
  Marker: 'machineName',
  MaxKeys: 1000,
};
var listFiles = s3.listObjects(listObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});

var getObjParams = {
  Bucket: 'senior-projects-cory', /* required */
  Key: 'getFile', /* required */
};
var getFileIntoBuf = s3.getObject(getObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});

var putObjParams = {
  Bucket: 'senior-projects-cory', /* required */
  Key: 'putFile', /* required */
};
var placeBufIntoFile = s3.putObject(putObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});

var consolidatedFile = new Buffer(listFiles.length);
var file;
var currFile;
for(file in listFiles){
	currFile = new Buffer(file.length);
    currFile.getFileIntoBuf;
	consolidatedFile.placeBufIntoFile;
}

context.done(null, "done");
}
