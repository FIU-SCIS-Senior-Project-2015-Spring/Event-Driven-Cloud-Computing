var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';

exports.consolidateAudit = function(event, context) {

var s3 = new AWS.S3();
var listObjParams = {
  Bucket: '.senior-projects-cory',
  EncodingType: 'url',
  Marker: 'machineName',
  MaxKeys: 1000,
};

s3.listObjects(listObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});

var getObjParams = {
  Bucket: 'STRING_VALUE', /* required */
  Key: 'STRING_VALUE', /* required */
};
s3.getObject(getObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});

var putObjParams = {
  Bucket: 'STRING_VALUE', /* required */
  Key: 'STRING_VALUE', /* required */
};

s3.putObject(putObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});


context.done(null, "done");
}
