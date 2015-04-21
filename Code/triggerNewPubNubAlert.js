//Trigger On Harddisk and Firewall Threshold, currently >= 80% for Harddisk.
//After triggering for alerts, consolidate all audit files in bucket.
//@Author Cory McAn

var pubnub = require('pubnub')({
    ssl           : true,
    publish_key   : "demo",
    subscribe_key : "demo"
});
var AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
//exports.triggerOnThresholdAndConsolidate = function(event, context) {
var bucket = "senior-projects-cory";
//event.Records[0].s3.bucket.name;
var srcKey = "facter-output.json";
//event.Records[0].s3.object.key;

checkConsolidated(listObjs);

function checkConsolidated(callback){
    console.log("putting " + srcKey + " into bucket " + bucket);
    if(srcKey === '_consolidated.json'){
        //context.done(null, "put file is consolidated file, do not alert.");
    }
    callback();
}

function listObjs(){
    s3.listObjects({Bucket: bucket}, haveList);
}

function haveList(err, data) {
    if (err) {
        console.log('error listing objects from bucket ' + bucket);
    }
    else {
        var consolidatedBuffer = new Buffer(100000);
        var fileListLen = data.Contents.length;
        var consolidatedString = "";
        var currentFilename;
        var totalBytes = 0;
        var previousFileLength = 0;
        var oldDiskAlert;
        var newDiskAlert;
        var oldDiskStatus;
        var newDiskStatus;
        var oldFirewallStatus;
        var newFirewallStatus;
        var oldExists = false;

        //read each file in the bucket to gather trigger information and consolidate
        var readObjs = function (index) {
            if (index == fileListLen) {
                console.log("Done reading files. totalBytes = " + totalBytes);
                if(oldExists) {
                    logAlerts();
                }else{
                    console.log("No old file exists");
                }
                consolidatedString = "{\n" + consolidatedBuffer.toString().substr(0, totalBytes).trim() + "\n}";
                //console.log(consolidatedString);
                s3.upload({
                    Bucket: bucket,
                    Key: '_consolidated.json',
                    Body: consolidatedString
                }, uploaded);
            } else {
                currentFilename = data.Contents[index].Key;
                s3.getObject({Bucket: bucket, Key: currentFilename}, function (error, data) {
                    if (error) {
                        console.log("Error reading object. ", error);
                    } else {
                        if(currentFilename === srcKey) {
                            //check any alerts related to uploaded file
                            checkAlertsSrc(data);
                        }
                        var currentStringLen;
                        var currentFileString;
                        if(index == fileListLen - 1){
                            currentFileString = "\"" + currentFilename + "\":\n" + data.Body.toString().trim() + "\n";
                        }else{
                            currentFileString = "\"" + currentFilename + "\":\n" + data.Body.toString().trim() + ",\n\n";
                        }
                        if(currentFilename === srcKey) {
                            console.log(currentFileString);
                        }
                        currentStringLen = currentFileString.length;
                        //exclude consolidated.json from consolidation if it exists
                        if (currentFilename != '_consolidated.json') {
                            consolidatedBuffer.write(currentFileString, previousFileLength);
                            previousFileLength += currentStringLen;
                            totalBytes += currentStringLen;
                            readObjs(index + 1);
                        }
                        else {
                            //check Old Consolidated file to compare alerts
                            oldExists = true;
                            checkAlertsOld(data);
                            readObjs(index + 1);
                        }
                    }
                });
            }
        };
        readObjs(0);
    }
    //confirm successful upload of consolidated file
    function uploaded(err, data) {
        if (err) {
            console.log("upload error!!");
        } else {
            console.log('uploaded _consolidated.json successfully!');
            //context.done(null, "done consolidating, output into " + bucket);
        }
    }

    //publish relevant alerts to PubNub Admin Console
    function publish(msg){
        pubnub.publish({
            channel   : 'admin_console',
            message   : msg,
            callback  : function(e) { console.log( "SUCCESS!", e ); },
            error     : function(e) { console.log( "FAILED! RETRY PUBLISH!", e ); }
        });
    }

    //log any relevant alerts to the console
    function logAlerts(){
        //log an alert if there is a NEW threshold on Harddrive OR Firewall, log "No Alert" otherwise

        var logOutput = "";

        if(!oldDiskAlert && newDiskAlert){
            logOutput += "New Harddisk Alert! Current Harddisk Status: " + newDiskStatus + "%. ";
            console.log("New Harddisk Alert! Current Harddisk Status: " + newDiskStatus + "%.");
        }else{
            logOutput += "No New Harddisk Alert. ";
            console.log("No New Harddisk Alert.");
        }

        if(oldFirewallStatus != newFirewallStatus){
            logOutput += "New Firewall Alert! Current Firewall Status: " + newFirewallStatus + "\n";
            console.log("New Firewall Alert! Current Firewall Status: " + newFirewallStatus);
        }else{
            logOutput += "Firewall Status Unchanged. ";
            console.log("Firewall Status Unchanged.");
        }

        var message = logOutput;
        publish(message);
    }

    //Check alert data in consolidated file
    function checkAlertsOld(data) {
        var fileBody = data.Body.toString();
        var JSONparsed;
        var diskUsageConsolidated;
        var fireWallStatusConsolidated;
        try{
            JSONparsed = JSON.parse(fileBody);
        }
        catch(e){
            console.trace(e);
        }
        try {
            var srcJSONinConsolidated = JSONparsed["" + srcKey + ""];
            diskUsageConsolidated = srcJSONinConsolidated.disk1_df_percent;
            fireWallStatusConsolidated = srcJSONinConsolidated.apple_firewall;
        }
        catch(f){
            console.trace(f);
        }


        //Check Old Firewall Status
        if(fireWallStatusConsolidated === undefined){
            console.log("firewallStatus not defined for old file in consolidated ");
        }
        else{
            oldFirewallStatus = fireWallStatusConsolidated;
        }

        //Check Old Disk Usage
        if (diskUsageConsolidated === undefined) {
            console.log("diskUsage not defined for consolidated file ");
        }
        //oldDiskUsage 0-9%
        else if (diskUsageConsolidated.length < 2) {
            oldDiskAlert = false;
        } else {
            var diskUsage;
            var newString;
            //oldDiskUsage 10-99%
            if (diskUsageConsolidated.length == 3) {
                newString = diskUsageConsolidated.substring(0, 2);
                diskUsage = parseInt(newString);
                if (diskUsage >= 80) {
                    oldDiskAlert = true;
                }else{
                    oldDiskAlert = false;
                }
            }//100% diskusage case
            else {
                newString = diskUsageConsolidated.substring(0, 3);
                diskUsage = parseInt(newString);
                oldDiskAlert = true;
            }
            oldDiskStatus = diskUsage;
        }
    }

    //Check alerts of src file
    function checkAlertsSrc(data){

        var fileBody = data.Body.toString();
        var JSONparsed;
        var srcDiskUsageString;
        var srcFirewallStatus;
        try{
            JSONparsed = JSON.parse(fileBody);
        }
        catch(e){
            console.error(e);
        }
        try {
            srcDiskUsageString = JSONparsed.disk1_df_percent;
            srcFirewallStatus = JSONparsed.apple_firewall;
        }
        catch(f){
            console.trace(f);
        }

        //Check source file firewallStatus
        if(srcFirewallStatus === undefined){
            console.log("firewallstatus not defined for " + srcKey);
        }
        else{
            newFirewallStatus = srcFirewallStatus;
        }

        //Check source file diskUsage
        if(srcDiskUsageString === undefined){
            console.log("diskUsage not defined for " + srcKey);
        }
        //srcDiskUsage 0-9%
        else if (srcDiskUsageString.length < 2) {
            newDiskAlert = false;
        } else {
            var diskUsage;
            var newString;
            //srcDiskUsage 10 - 99%
            if (srcDiskUsageString.length == 3) {
                newString = srcDiskUsageString.substring(0, 2);
                diskUsage = parseInt(newString);
                if (diskUsage >= 80) {
                    newDiskAlert = true;
                }
            }
            //srcDiskUsage 100%
            else {
                newString = srcDiskUsageString.substring(0, 3);
                diskUsage = parseInt(newString);
                newDiskAlert = true;
            }
            newDiskStatus = diskUsage;
        }
    }
}