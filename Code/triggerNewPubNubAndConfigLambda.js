//Trigger On Harddisk and Firewall Threshold.
//Sends alert message to PubNub after alerts are collected.
//Gets configuration data from _config.json to allow editing of alerts.
//After triggering for alerts, consolidate all audit files in bucket.
//@Author Cory McAn

var AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
exports.triggerNewPubNubAndConfigAlert = function(event, context) {
    var bucket = event.Records[0].s3.bucket.name;
    var srcKey = event.Records[0].s3.object.key;

    checkConsolidated(listObjs);

    function checkConsolidated(callback) {
        console.log("putting " + srcKey + " into bucket " + bucket);
        if (srcKey === '_consolidated.json') {
            context.done(null, "put file is consolidated file, do not alert.");
        }else if (srcKey === '_config.json'){
            context.done(null, "put file is config file, do not alert.");
        }
        callback();
    }

    function listObjs() {
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
            var pubKey;
            var subKey;
            var alertFirewallString = "";
            var alertHarddiskString = "";
            var alertBatteryString = "";
            var alertPubNubString = "";
            var alertFirewall = false;
            var alertHarddisk = false;
            var alertPubNub = false;
            var alertPubNub2 = true;
            var alertBattery = false;
            var firewallName;
            var harddiskName;
            var batteryName1;
            var batteryName2;
            var firewallVal;
            var harddiskVal;
            var batteryVal1;
            var batteryVal2;
            var srcDiskUsageString;
            var srcFirewallStatus;
            var diskUsageConsolidated;
            var fireWallStatusConsolidated;

            //read each file in the bucket to gather trigger information and consolidate
            var readObjs = function (index) {
                if (index == fileListLen) {
                    console.log("Done reading files. totalBytes = " + totalBytes);
                    if (oldExists) {
                        logAlerts();
                    } else {
                        console.log("No old file exists");
                    }
                    consolidatedString = "{\n" + consolidatedBuffer.toString().substr(0, totalBytes).trim() + "\n}";
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
                            if (currentFilename === srcKey && currentFilename != '_consolidated.json' && currentFilename != '_config.json') {
                                //check any alerts related to uploaded file
                                checkAlertsSrc(data);
                            }
                            var currentStringLen;
                            var currentFileString;
                            if (index == fileListLen - 1) {
                                currentFileString = "\"" + currentFilename + "\":\n" + data.Body.toString().trim() + "\n";
                            } else {
                                currentFileString = "\"" + currentFilename + "\":\n" + data.Body.toString().trim() + ",\n\n";
                            }
                            currentStringLen = currentFileString.length;
                            //exclude consolidated.json from consolidation if it exists
                            if (currentFilename != '_consolidated.json' && currentFilename != '_config.json') {
                                consolidatedBuffer.write(currentFileString, previousFileLength);
                                previousFileLength += currentStringLen;
                                totalBytes += currentStringLen;
                                readObjs(index + 1);
                            }
                            else {
                                if (currentFilename === '_consolidated.json') {
                                    //check Old Consolidated file to compare alerts
                                    oldExists = true;
                                    checkAlertsOld(data);
                                    readObjs(index + 1);
                                } else if (currentFilename === '_config.json') {
                                    //change alert values for consolidated and source file
                                    checkConfig(data);
                                    readObjs(index + 1);
                                }
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
                context.done(null, "done consolidating, output into " + bucket);
            }
        }

        //check config.json for alert configuration
        function checkConfig(data) {
            var fileBody = data.Body.toString();
            var JSONparsed;
            try {
                JSONparsed = JSON.parse(fileBody);
            }
            catch (e) {
                console.trace(e);
            }
            try {
                var alertConfig = JSONparsed.alerts;
                try {
                    var pubNubConfig = alertConfig.pubnubMsg;
                    pubKey = pubNubConfig.pubKey;
                    subKey = pubNubConfig.subKey;
                    alertPubNubString = pubNubConfig.activated;
                    if (alertPubNubString === 'on') alertPubNub = true;
                }
                catch (e) {
                    console.trace(e);
                }
                try {
                    var firewallConfig = alertConfig.firewall;
                    firewallName = firewallConfig.varname;
                    firewallVal = firewallConfig.v;
                    alertFirewallString = firewallConfig.activated;
                    if (alertFirewallString === 'on') alertFirewall = true;
                }
                catch (e) {
                    console.trace(e);
                }

                try {
                    var harddiskConfig = alertConfig.harddisk;
                    harddiskName = harddiskConfig.varname;
                    harddiskVal = harddiskConfig.v;
                    alertHarddiskString = harddiskConfig.activated;
                    if (alertHarddiskString === 'on') alertHarddisk = true;
                }
                catch (e) {
                    console.trace(e);
                }

                //batteryName1 = alertConfig.battery.varname1;
                //batteryName2 = alertConfig.battery.varname2;
                //batteryVal1 = alertConfig.battery.v;
                //alertBatteryString = alertConfig.battery.activated;
                //if(alertBatteryString === 'on') alertBattery = true;
            }
            catch (f) {
                console.trace(f);
            }
        }

        //publish relevant alerts to PubNub Admin Console
        function publish(msg) {
            var pubnub = require('pubnub')({
                ssl: true,
                publish_key: pubKey,
                subscribe_key: subKey
            });
            pubnub.publish({
                channel: 'admin_console',
                message: msg,
                callback: function (e) {
                    console.log("SUCCESS!", e);
                },
                error: function (e) {
                    console.log("PubNub Message FAILED! Check _config.json keys.", e);
                }
            });
        }

        //log any relevant alerts to the console
        function logAlerts() {
            //log an alert if there is a NEW threshold on Harddrive OR Firewall, log "No Alert" otherwise

            var logOutput = "Alerts: ";
            var harddiskString = "New Harddisk Alert! Current Harddisk Status: " + newDiskStatus + "%. ";
            if ((!oldDiskAlert && newDiskAlert) && alertHarddisk) {
                logOutput += harddiskString;
                console.log(harddiskString);
            } else if (alertHarddisk == false) {
                //do not include Harddisk information in output.
            } else {
                //special case for bad consolidated file data
                var noAlert = "No New Harddisk Alert. "
                logOutput += noAlert;
                console.log(noAlert);
            }

            var firewallString = "New Firewall Alert! Current Firewall Status: " + newFirewallStatus + ". ";
            //ensure firewall alert only if it matches config.json value
            if ((oldFirewallStatus != newFirewallStatus) && alertFirewall && (newFirewallStatus == firewallVal)) {

                logOutput += firewallString;
                console.log(firewallString);
            } else if (alertFirewall == false) {
                //do not include Firewall information in output.
            } else {
                //special case for bad consolidated file data
                if(alertFirewall && oldFirewallstatus === undefined && (newFirewallStatus === firewallVal)){
                    logOutput += firewallString;
                    console.log(firewallString);
                }
                var noAlert = "No New Firewall alert. ";
                logOutput += noAlert;
                console.log(noAlert);
            }

            if (alertPubNub && alertPubNub2) {
                publish(logOutput);
            }
            else {
                console.log("PubNub alert not activated, no PubNub message sent.");
            }
        }

        //Check alert data in consolidated file
        function checkAlertsOld(data) {
            var fileBody = data.Body.toString();
            var JSONparsed;
            try {
                JSONparsed = JSON.parse(fileBody);
            }
            catch (e) {
                console.trace(e);
            }
            try {
                var srcJSONinConsolidated = JSONparsed["" + srcKey + ""];
                diskUsageConsolidated = srcJSONinConsolidated["" + harddiskName + ""];
                fireWallStatusConsolidated = srcJSONinConsolidated["" + firewallName + ""];
            }
            catch (f) {
                console.trace(f);
            }

            //Check Old Firewall Status
            if (fireWallStatusConsolidated === undefined) {
                console.log("firewallStatus not defined for old file in consolidated or firewallName mismatch in config.json");
            }
            else {
                oldFirewallStatus = fireWallStatusConsolidated;
            }

            //Check Old Disk Usage
            if (diskUsageConsolidated === undefined) {
                console.log("diskUsage not defined for consolidated file or harddiskName mismatch in config.json");
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
                    if (diskUsage >= harddiskVal) {
                        oldDiskAlert = true;
                    } else {
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
        function checkAlertsSrc(data) {

            var fileBody = data.Body.toString();
            var JSONparsed;
            try {
                JSONparsed = JSON.parse(fileBody);
            }
            catch (e) {
                console.error(e);
            }
            try {
                srcDiskUsageString = JSONparsed["" + harddiskName + ""];
                srcFirewallStatus = JSONparsed["" + firewallName + ""];
            }
            catch (f) {
                console.trace(f);
            }

            //Check source file firewallStatus
            if (srcFirewallStatus === undefined) {
                console.log("firewallstatus not defined for " + srcKey + " or firewallName mismatch in config.json");
                //alertPubNub2 = false;
            }
            else {
                newFirewallStatus = srcFirewallStatus;
            }

            //Check source file diskUsage
            if (srcDiskUsageString === undefined) {
                console.log("diskUsage not defined for " + srcKey + " or harddiskName mismatch in config.json");
                //alertPubNub2 = false;
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
                    if (diskUsage >= harddiskVal) {
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
};