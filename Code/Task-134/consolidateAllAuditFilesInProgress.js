//Consolidate all Audit Data into One file.
//@Author Cory McAn
var aws = require('aws-sdk');
var fs = require('fs');
var s3 = new aws.S3({apiVersion: '2006-03-01'});

exports.consolidateAudit = function(event, context) {
   console.log("run");
   var consolidatedBuffer = new Buffer(595);
   var consolidatedString;
   var listLength;
   var objlist;

function runFunction(list, bucket){
    console.log("ran me");
    console.log("list: " + list + " bucket: " + bucket);
}

    function getList(callback){
    var bucket = 'senior-projects-cory';
    var err;
    var list;
        s3.listObjects({Bucket:'senior-projects-cory'}, function lister(err, data) {
        if (err) {
           console.log('error listing objects from bucket ' + bucket);
           context.done('error',err);
        }
        else {
            console.log("list success. get objects from list now, data: ", data.Contents);
            listLength = data.Contents.length;
            console.log("listlen = " , listLength);
        }
      });
    }
    
getList(objlist, runFunction);

/*

//SIMPLE CALLBACK EXAMPLE, CURRENTLY WORKS!

function runMe(list, bucket){
    console.log("ran me");
    console.log("list: " + list + " bucket: " + bucket);
}

function getList(something, random){
    var list = [123,456,789];
    var bucket = 'senior-projects-cory';
    
    if(typeof random === "function"){
        random(list, bucket);
        
    }
}
var variable;
getList(variable, runMe);

//END SIMPLE CALLBACK EXAMPLE



    objlist = s3.listObjects({Bucket:'senior-projects-cory'},
      function getList(err, data) {
        if (err) {
           console.log('error listing objects from bucket ' + bucket);
           context.done('error',err);
        }
        else {
            console.log("list success. get objects from list now  data: ", data);
            listLength = data.Contents.length;
            console.log("listlen = " , listLength);
            return data;
        }
      }
   );

   
   s3.getObject({Bucket:'senior-projects-cory', Key: objlist.Contents[i].Key}, 
            function getObj(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     // successful response
                     currentFileString = data.Body.toString();
                     currentStringLen = currentFileString.length;
                     console.log(currentFileString + "\n" + currentStringLen);
                     if(currentFilename != 'consolidated.txt' && currentFilename != 'consolidated.json'){
                     console.log("not .json... \n");
                     consolidatedBuffer.write(currentFileString, 0, currentStringLen, 'utf8');
                     console.log("data from " + currentFilename + " written to consolidated.txt!");
            }
            
            });
   
   
    function gotList(listofobjs){
            var i = 0;
            var currentFileString;
            var currentStringLen;
            for(i; i < listofobjs.length; i++){
            var currentFilename = listofobjs.Contents[i].Key;
            console.log('filename: ', currentFilename);
               getObj(listofobjs, i);
           }//END FOR
   }
   
           function gotFiles(){
           consolidatedString = consolidatedBuffer.toString();
           
           s3.upload({Bucket: 'senior-projects-cory', Key: 'consolidated.txt', Body: consolidatedString}, function(err, data) {
               if(err)     console.log('error occurred! error: ', err);
               else        console.log('no error, data: ', data);
                           console.log('contents of file: ', consolidatedString);
            });
}

function consolidateFiles(){
    getList();
    console.log("getlist run");
    gotList(objlist);
    console.log("gotlist run");
    gotFiles();

}

consolidateFiles();
*/
context.done(null, "done consolidating");
};//end