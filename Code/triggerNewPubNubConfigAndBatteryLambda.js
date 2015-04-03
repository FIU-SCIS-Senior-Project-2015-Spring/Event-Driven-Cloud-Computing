//Trigger On Harddisk, Battery and Firewall Threshold.
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
        } else if (srcKey === '_config.json') {
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
            var oldBatteryAlert;
            var newBatteryAlert;
            var oldDiskStatus;
            var newDiskStatus;
            var oldFirewallStatus;
            var newFirewallStatus;
            var oldBatteryStatus;
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
            var alertBatteryHealth = false;
            var firewallName;
            var harddiskName;
            var batteryName;
            var batteryName0;
            var batteryName1;
            var batteryName2;
            var firewallVal;
            var harddiskVal;
            var batteryVal;
            var srcDiskUsageString;
            var srcFirewallStatus;
            var srcBatteryStatus;
            var srcBatteryHealth;
            var srcBatteryCycles;
            var srcBattery;
            var srcBattery0;
            var srcBattery1;
            var srcBattery2;
            var diskUsageConsolidated;
            var fireWallStatusConsolidated;
            var battery1Consolidated;
            var battery2Consolidated;

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

                //pubnub config
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

                //firewall config
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

                //harddisk config
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

                //battery config
                try {
                    var batteryConfig = alertConfig.battery;
                    batteryName = batteryConfig.varname;
                    batteryName0 = batteryConfig.varname0;
                    batteryName1 = batteryConfig.varname1;
                    batteryName2 = batteryConfig.varname2;
                    batteryVal = batteryConfig.v;
                    alertBatteryString = batteryConfig.activated;
                    if (alertBatteryString === 'on') alertBattery = true;
                }
                catch (e) {
                    console.trace(e);
                }
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

            //harddiskStatus Alerts
            var harddiskString = "New Harddisk Alert! Current Harddisk Status: " + newDiskStatus + "%. ";
            if ((!oldDiskAlert && newDiskAlert) && alertHarddisk) {
                logOutput += harddiskString;
                console.log(harddiskString);
            } else if (alertHarddisk == false) {
                //do not include Harddisk information in output.
            } else {
                var noAlert = "No New Harddisk Alert. "
                logOutput += noAlert;
                console.log(noAlert);
            }

            //FirewallStatus Alerts
            var firewallString = "New Firewall Alert! Current Firewall Status: " + newFirewallStatus + ". ";
            //ensure firewall alert only if it matches config.json value
            if ((oldFirewallStatus != newFirewallStatus) && alertFirewall && (newFirewallStatus == firewallVal)) {

                logOutput += firewallString;
                console.log(firewallString);
            } else if (alertFirewall == false) {
                //do not include Firewall information in output.
            } else if (alertFirewall && oldFirewallstatus === undefined && (newFirewallStatus === firewallVal)) {
                logOutput += firewallString;
                console.log(firewallString);
            } else {
                var noAlert = "No New Firewall Alert. ";
                logOutput += noAlert;
                console.log(noAlert);
            }

            //BatteryHealth alerts
            var batteryHealthString = "Battery Health Alert! Battery Health: " + srcBatteryHealth + ". Number of charge cycles: " + srcBatteryCycles + ". ";
            if (alertBatteryHealth && alertBattery) {
                logOutput += batteryHealthString;
                console.log(batteryHealthString);
            } else {
                var healthGood = "Battery Health Good. ";
                logOutput += healthGood;
                console.log(healthGood);
            }

            //BatteryStatus alerts
            srcBatteryStatus = srcBatteryStatus.toString();
            srcBatteryStatus = srcBatteryStatus.substring(0, 4);
            var batteryString = "New Battery Level Alert! Current Battery Status: " + srcBatteryStatus + "%. ";
            if ((!oldBatteryAlert && newBatteryAlert) && alertBattery) {
                logOutput += batteryString;
                console.log(batteryString);
            } else if (alertBattery == false) {
                //do not include Battery information in output.
            } else {
                if (alertBattery && oldBatteryStatus === undefined && (newBatteryAlert)) {
                    logOutput += batteryString;
                    console.log(batteryString);
                }
                var noAlert = "No New BatteryStatus Alert. ";
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
            var fileBody;
            var JSONparsed;
            try {
                fileBody = data.Body.toString();
                JSONparsed = JSON.parse(fileBody);
            }
            catch (e) {
                console.trace(e);
            }
            try {
                var srcJSONinConsolidated = JSONparsed["" + srcKey + ""];
                diskUsageConsolidated = srcJSONinConsolidated["" + harddiskName + ""];
                fireWallStatusConsolidated = srcJSONinConsolidated["" + firewallName + ""];
                battery1Consolidated = srcJSONinConsolidated["" + batteryName1 + ""];      //batterystatus1
                battery2Consolidated = srcJSONinConsolidated["" + batteryName2 + ""];      //batterystatus2
            }
            catch (f) {
                console.trace(f);
            }

            //Check Old Battery Status
            if (battery1Consolidated === undefined || battery2Consolidated === undefined) {
                console.log("batteryStatus not defined for old file in consolidated or batteryName mismatch in config.json");
            }
            else {
                oldBatteryStatus = (battery1Consolidated / battery2Consolidated) * 100;
                if (oldBatteryStatus <= batteryVal) {
                    oldBatteryAlert = true;
                }
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
                srcBattery = JSONparsed["" + batteryName + ""];    //batterycycles
                srcBattery0 = JSONparsed["" + batteryName0 + ""];  //batteryhealth
                srcBattery1 = JSONparsed["" + batteryName1 + ""];  //batterystatus1
                srcBattery2 = JSONparsed["" + batteryName2 + ""];  //batterystatus2
            }
            catch (f) {
                console.trace(f);
            }

            //Check source Battery Health
            if (srcBattery === undefined || srcBattery0 === undefined) {
                console.log("Check batteryCycles and batteryHealth values in " + srcKey + " or mismatch in config.json");
            }
            else if (srcBattery0 != 'good') {
                srcBatteryCycles = srcBattery;
                srcBatteryHealth = srcBattery0;
                alertBatteryHealth = true;
            }

            //Check source Battery Status
            if (srcBattery1 === undefined || srcBattery2 === undefined) {
                console.log("batteryStatus not defined for " + srcKey + " or batteryStatusName mismatch in config.json");
            }
            else {
                srcBatteryStatus = (srcBattery1 / srcBattery2) * 100;
                if (srcBatteryStatus <= batteryVal) {
                    newBatteryAlert = true;
                }
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
