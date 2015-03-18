//Trigger On Harddisk Usage Threshold, currently >= 80%
//@Author Cory McAn
var AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
//exports.consolidateAudit = function(event, context) {
    var bucket = 'senior-projects-cory';
        //event.Records[0].s3.bucket.name;
    var srcKey = 'facter-output.json';
        //event.Records[0].s3.object.key;

    s3.getObject({Bucket: bucket, Key: srcKey}, function (error, data) {
        var diskUsage;
        if (error) {
            console.log("Error reading object. ", error);
        } else {
            var fileBody = data.Body.toString();
            var JSONparsed = JSON.parse(fileBody);
            var diskUsageString = JSONparsed.disk1_df_percent;
            if(diskUsageString === undefined){
                //context.done(null, "diskUsage not defined for the file " + srcKey);
            }
            else if (diskUsageString.length < 2) {
                console.log("No harddisk threshold reached. Harddisk Usage Value: " + diskUsageString);
            } else {
                if (diskUsageString.length == 3) {
                    var newString = diskUsageString.substring(0, 2);
                    diskUsage = parseInt(newString);
                    if (diskUsage >= 80) {
                        console.log("Alert! \nCurrent DiskUsage: " + diskUsage + "%.");
                        //context.done(null, "Alert completed");
                    }
                } else {
                    console.log("Alert! \nCurrent DiskUsage: " + diskUsageString + ".");
                    //context.done(null, "Alert completed");
                }
            }
        }
    });
//}