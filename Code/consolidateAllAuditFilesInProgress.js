//Consolidate all Audit Data into One file.
//@Author Cory McAn
var aws = require('aws-sdk');
var fs = require('fs');
var s3 = new aws.S3({apiVersion: '2006-03-01'});

exports.consolidateAudit = function(event, context) {
   console.log("run");
   var consolidatedBuffer = new Buffer(595);
   s3.listObjects({Bucket:'senior-projects-cory'},
      function(err, data) {
        if (err) {
           console.log('error listing objects from bucket ' + bucket);
           context.done('error',err);
        }
        else {
            
            var i = 0;
            var write = 0;
            var currentFileString;
            var currentStringLen;
            for(i; i < data.Contents.length; i++){
            var currentFilename = data.Contents[i].Key;
            console.log('filename: ', currentFilename);
            
            
            
            s3.getObject({Bucket:'senior-projects-cory', Key: data.Contents[i].Key}, 
            function gotObject(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     // successful response
                     currentFileString = data.Body.toString();
                     currentStringLen = currentFileString.length;
                     console.log(currentFileString + "\n" + currentStringLen);
                     if(currentFilename != 'consolidated.txt' && write < 1){
                     console.log("not .json... \n");
                     consolidatedBuffer.write(currentFileString, 0, currentStringLen, 'utf8');
                     write += 1;
                     console.log("data from " + currentFilename + " written to consolidated.txt!");
            }
            
            });
            
            
            
           }//END FOR
           s3.upload({Bucket: 'senior-projects-cory', Key: 'consolidated.txt', Body: consolidatedBuffer}, function(err, data) {
            console.log(err, data);
            });

        }
      }
   );

           var currentFile = fs.readFileSync('','utf8');
           console.log ("print txt! : " + currentFile);


function processFile(callback){
    //fs.readFile(currentFile, function fileRead(err, fileContents){
       // var contents = new Buffer(currentFile.size);
        
        
  }

    


//not working yet
/*
s3.getObject({Bucket:'senior-projects-cory', Key: 'helloworld.txt'}, function gotObject(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});
*/

context.done(null, "done consolidating");
};//end





/*

*/
/*
console.log("outside");


var getObjParams = {
  Bucket: 'senior-projects-cory/',
};
var getFileIntoBuf = s3.getObject(getObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});


/*
var putObjParams = {
  Bucket: 'senior-projects-cory/',
};
var placeBufIntoFile = s3.putObject(putObjParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});
*/




/*
var writeConsolidated = fs.appendFile('consolidated/consolidated.json', "test", function (err) {
  if (err) return console.log(err);
  console.log('Files Consolidated');
});
*/

/*
var readErr = new Error();
var writeErr = new Error();
var consolidatedFile = new Buffer(100000);

var currFile;
console.log(listFiles.toString());


*/
/*
var file = 'senior-projects-cory/mac-example.json';
var readCurrent = fs.readFile(file, 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  console.log(data);
});
//for(file in listFiles){
	currFile = readCurrent(file, 'utf8', null);
    console.log("current file: \n", JSON.stringify(currFile));
	//writeConsolidated();
//}
*/


//context.done(null, "done");