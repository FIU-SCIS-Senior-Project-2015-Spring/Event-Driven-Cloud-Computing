//Consolidate all Audit Data into One file.
//@Author Cory McAn
var aws = require('aws-sdk');
var fs = require('fs');
var s3 = new aws.S3({apiVersion: '2006-03-01'});

exports.consolidateAudit = function(event, context) {
   s3.listObjects({Bucket:'senior-projects-cory'},
      function(err,data) {
        if (err) {
           console.log('error listing objects from bucket ');
           context.done('error',err);
        }
        else {
           console.log('data: ', data);
        }
      }
   );

function processFile(callback){
    fs.readFile(currentFile, function fileRead(err, fileContents){
        var contents = new Buffer(currentFile.size);
    }
}

s3.getObject({Bucket:'senior-projects-cory', Key: 'helloworld.txt'}, function gotObject(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});

context.done(null, "done consolidating");
}//end
