var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';

exports.consolidateAudit = function(event, context) {

var s3 = new AWS.S3();
var listObjParams = {
  Bucket: '.senior-projects-cory',
  Delimiter: '{}',
  EncodingType: 'url',
  Marker: 'machineName',
  MaxKeys: 1000,
  Prefix: '{}'
};

s3.listObjects(listObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});

var getObjParams = {
  Bucket: 'STRING_VALUE', /* required */
  Key: 'STRING_VALUE', /* required */
  IfMatch: 'STRING_VALUE',
  IfModifiedSince: new Date() || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
  IfNoneMatch: 'STRING_VALUE',
  IfUnmodifiedSince: new Date() || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
  Range: 'STRING_VALUE',
  ResponseCacheControl: 'STRING_VALUE',
  ResponseContentDisposition: 'STRING_VALUE',
  ResponseContentEncoding: 'STRING_VALUE',
  ResponseContentLanguage: 'STRING_VALUE',
  ResponseContentType: 'STRING_VALUE',
  ResponseExpires: new Date() || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
  SSECustomerAlgorithm: 'STRING_VALUE',
  SSECustomerKey: 'STRING_VALUE',
  SSECustomerKeyMD5: 'STRING_VALUE',
  VersionId: 'STRING_VALUE'
};
s3.getObject(getObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});

var putObjParams = {
  Bucket: 'STRING_VALUE', /* required */
  Key: 'STRING_VALUE', /* required */
  ACL: 'private | public-read | public-read-write | authenticated-read | bucket-owner-read | bucket-owner-full-control',
  Body: new Buffer('...') || 'STRING_VALUE' || streamObject,
  CacheControl: 'STRING_VALUE',
  ContentDisposition: 'STRING_VALUE',
  ContentEncoding: 'STRING_VALUE',
  ContentLanguage: 'STRING_VALUE',
  ContentLength: 0,
  ContentMD5: 'STRING_VALUE',
  ContentType: 'STRING_VALUE',
  Expires: new Date() || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789,
  GrantFullControl: 'STRING_VALUE',
  GrantRead: 'STRING_VALUE',
  GrantReadACP: 'STRING_VALUE',
  GrantWriteACP: 'STRING_VALUE',
  Metadata: {
    someKey: 'STRING_VALUE',
    /* anotherKey: ... */
  },
  SSECustomerAlgorithm: 'STRING_VALUE',
  SSECustomerKey: 'STRING_VALUE',
  SSECustomerKeyMD5: 'STRING_VALUE',
  SSEKMSKeyId: 'STRING_VALUE',
  ServerSideEncryption: 'AES256',
  StorageClass: 'STANDARD | REDUCED_REDUNDANCY',
  WebsiteRedirectLocation: 'STRING_VALUE'
};

s3.putObject(putObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});


context.done(null, "done");
}
