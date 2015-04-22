exports.runMultipleTest = function(event, context) {
    var AWS = require('aws-sdk');
    AWS.config.region = 'us-east-1';
    var s3 = new AWS.S3({apiVersion: '2006-03-01'});
    var bucket = event.Records[0].s3.bucket.name;
    var srcKey = event.Records[0].s3.object.key;

    checkConsolidated(listObjs);

    function checkConsolidated(callback) {
        var isLog = srcKey.search("_log");
        console.log("putting " + srcKey + " into bucket " + bucket);
        if (srcKey === '_consolidated.json') {
            context.succeed(null, "put file is consolidated file, do not alert.");
        } else if (srcKey === '_config.json') {
            context.succeed(null, "put file is config file, do not alert.");
        } else if (isLog >= 0) {
            context.succeed(null, "put file is log file, do not alert.");
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
            var oldExists = false;
            //config variables
            var oldDiskAlert;
            var newDiskAlert = false;
            var oldBatteryAlert;
            var newBatteryAlert;
            var oldDiskStatus;
            var newDiskStatus;
            var oldFirewallStatus;
            var newFirewallStatus;
            var oldBatteryStatus;
            var newBatteryStatus;
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
            var antivirusSearchString;
            var alertAntivirusString;
            var alertAntivirus = false;
            var antivirusAlertFound = false;
            var antivirusAlertDetails = "";
            var host;
            var hostNm;
            var hostName;
            //multiRunTester variables
            var alerted = false;
            var consolidatedFileBody;
            var srcKeyOfLog;
            var channel;
            var sentAntivirus = false;
            var consolidatedResult;
            var freshConsolidated = true;
            var checkLog;
            var messageCount = 0;
            var messagesSent = 0;
            var loggedAlerts = false;
            var lastFile = false;

            //read each file in the bucket to gather trigger information and consolidate
            var readObjs = function (index) {
                if (index == fileListLen) {
                    console.log("Done reading files. totalBytes = " + totalBytes);
                    if (!alerted) {
                            logAlerts();
                    } else {
                        console.log("Not logging for " + srcKey);
                    }
                    consolidatedString = "{\n" + consolidatedBuffer.toString().substr(0, totalBytes).trim() + "\n}";
                    if (srcKey === currentFilename && srcKey != '_consolidated.json' && srcKey != '_config.json' && checkLog == -1) {
                        //consolidation for MultiPartUpload. Only Consolidate on last file.
                        lastFile = true;
                        consolidatedResult = consolidatedString;
                        setTimeout(upload, 1000);
                    }
                } else {
                    currentFilename = data.Contents[index].Key;
                    checkLog = currentFilename.search("_log");
                    s3.getObject({Bucket: bucket, Key: currentFilename}, function (error, data) {
                        if (error) {
                            console.log("Error reading object. ", error);
                        } else {
                            //Only update current file in consolidated to avoid
                            if (currentFilename === srcKey && currentFilename != '_consolidated.json' && currentFilename != '_config.json' && checkLog == -1) {
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
                            //variable to check if currentfile is a log file
                            if (checkLog >= 0) {
                                var replaceUnderscore = currentFilename.replace("_", "");
                                srcKeyOfLog = replaceUnderscore.replace("_log", "");
                            }

                            //exclude consolidated.json from consolidation if it exists
                            if (currentFilename != '_consolidated.json' && currentFilename != '_config.json' && checkLog === -1 && freshConsolidated) {
                                consolidatedBuffer.write(currentFileString, previousFileLength);
                                previousFileLength += currentStringLen;
                                totalBytes += currentStringLen;
                            }
                            else {
                                if (currentFilename === '_consolidated.json') {
                                    //check Old Consolidated file to compare alerts
                                    oldExists = true;
                                    checkAlertsOld(data);
                                } else if (currentFilename === '_config.json') {
                                    //change alert values for consolidated and source file
                                    checkConfig(data);
                                } else if (checkLog >= 0 && srcKeyOfLog === srcKey) {
                                    //check antivirus alerts for machine
                                    if (!sentAntivirus && alertAntivirus) {
                                        checkAntivirusLog(data);
                                    }
                                }
                            }
                            readObjs(index + 1);
                        }
                    });
                }
            };
            readObjs(0);
        }

        function upload(){
            s3.upload({
                Bucket: bucket,
                Key: '_consolidated.json',
                Body: consolidatedResult
            }, uploaded);
        }

        //confirm successful upload of consolidated file
        function uploaded(err, data) {
            if (err) {
                console.log("upload error!!");
            } else {
                console.log('uploaded _consolidated.json successfully!');
                context.succeed(null, "done consolidating, output into " + bucket);
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

                //hostname
                try {
                    host = alertConfig.hostnm;
                    hostNm = host.varname;
                }
                catch (e) {
                    console.trace(e);
                }

                //antivirus config
                try {
                    var antivirusConfig = alertConfig.antivirus;
                    antivirusSearchString = antivirusConfig.search_string;
                    alertAntivirusString = antivirusConfig.activated;
                    if (alertAntivirusString === 'on') alertAntivirus = true;
                }
                catch (e) {
                    console.trace(e);
                }

                //pubnub config
                try {
                    var pubNubConfig = alertConfig.pubnubMsg;
                    channel = pubNubConfig.pubchannel;
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
            messageCount += 1;
            var pubnub = require('pubnub')({
                ssl: true,
                publish_key: pubKey,
                subscribe_key: subKey
            });
            pubnub.publish({
                channel: channel,
                message: msg,
                callback: function (e) {
                    messagesSent += 1;
                    console.log("SUCCESS!", e);
                    //end execution of alerting when all messages have been sent
                    if (messageCount === messagesSent && loggedAlerts && !lastFile && !up) {
                        context.succeed("All messages sent! Execution complete");
                    }
                },
                error: function(f){
                    console.trace(f);
                    publish(msg);
                }
            });
        }

        //log any relevant alerts to the console
        function logAlerts() {
            //log an alert if there is a NEW threshold on Harddrive OR Firewall, log "No Alert" otherwise
            if (hostName === undefined) {
                context.succeed(null, "hostname undefined for " + srcKey + "!!!");
            } else if (alerted) {
                context.succeed(null, "alerted published alerts for " + srcKey + " !!!");
            }
            else {
                alerted = true;
                var logOutput = "Alerts: ";

                //harddiskStatus Alerts
                var harddiskString = "Harddisk Alert! Current Harddisk Status: " + newDiskStatus + "%. ";
                if ((!oldDiskAlert && newDiskAlert) && alertHarddisk) {
                    logOutput += harddiskString;
                    console.log(harddiskString);
                    publish("hostname: " + hostName + ": " + harddiskString);
                } else if (alertHarddisk == false) {
                    //do not include Harddisk information in output.
                } else {
                    var noAlert = "No Harddisk Alert. "
                    logOutput += noAlert;
                    console.log(noAlert);
                    publish("hostname: " + hostName + ": " + noAlert + " old: " + oldDiskStatus + "% new: " + newDiskStatus + "%. ");
                }

                //FirewallStatus Alerts
                var firewallString = "Firewall Alert! Current Firewall Status: " + newFirewallStatus + ". ";
                //ensure firewall alert only if it matches config.json value
                if ((oldFirewallStatus != newFirewallStatus) && alertFirewall && (newFirewallStatus == firewallVal)) {
                    logOutput += firewallString;
                    console.log(firewallString);
                    publish("hostname: " + hostName + ": " + firewallString);
                } else if (alertFirewall == false) {
                    //do not include Firewall information in output.
                } else if (alertFirewall && oldFirewallStatus === undefined && (newFirewallStatus === firewallVal)) {
                    logOutput += firewallString;
                    console.log(firewallString);
                    publish("hostname: " + hostName + ": " + firewallString);
                } else {
                    var noAlert = "No Firewall Alert. ";
                    logOutput += noAlert;
                    console.log(noAlert);
                    publish("hostname: " + hostName + ": " + noAlert + " old: " + oldFirewallStatus + " new: " + newFirewallStatus);
                }

                //BatteryHealth alerts
                var batteryHealthString = "Battery Health Alert! Battery Health: " + srcBatteryHealth + ". Number of charge cycles: " + srcBatteryCycles + ". ";
                if (alertBatteryHealth && alertBattery) {
                    logOutput += batteryHealthString;
                    console.log(batteryHealthString);
                    publish("hostname: " + hostName + ": " + batteryHealthString);
                } else if (alertBattery) {
                    var healthGood = "Battery Health Good. ";
                    logOutput += healthGood;
                    console.log(healthGood);
                    publish("hostname: " + hostName + ": " + healthGood);
                }

                //BatteryStatus alerts
                srcBatteryStatus = srcBatteryStatus.toString();
                srcBatteryStatus = srcBatteryStatus.substring(0, 4);
                if (oldBatteryStatus != undefined) {
                    oldBatteryStatus = oldBatteryStatus.toString();
                    oldBatteryStatus = oldBatteryStatus.substring(0, 4);
                }
                var batteryString = "Battery Level Alert! Current Battery Level: " + srcBatteryStatus + "%. ";
                if ((!oldBatteryAlert && newBatteryAlert) && alertBattery) {
                    logOutput += batteryString;
                    console.log(batteryString);
                    publish("hostname: " + hostName + ": " + batteryString);
                } else if (alertBattery == false) {
                    //do not include Battery information in output.
                } else {
                    if (alertBattery && oldBatteryStatus === undefined && (newBatteryAlert)) {
                        logOutput += batteryString;
                        console.log(batteryString);
                        publish("hostname: " + hostName + ": " + batteryString);
                    } else {
                        var noAlert = "No Battery Level Alert. ";
                        logOutput += noAlert;
                        console.log(noAlert);
                        publish("hostname: " + hostName + ": " + noAlert + " old: " + oldBatteryStatus + "% new: " + srcBatteryStatus + "%. ");
                    }
                }
                loggedAlerts = true;
            }
        }

        //check antivirus alerts for srcKey
        function checkAntivirusLog(data) {
            sentAntivirus = true;
            var fileBody;
            var JSONparsed;
            try {
                //find hostname in consolidated file
                try {
                    JSONparsed = JSON.parse(consolidatedFileBody);
                    var srcJSONinConsolidated = JSONparsed[srcKeyOfLog];
                    var hostname = srcJSONinConsolidated[host.varname];
                }
                catch (e) {
                    console.trace(e);
                }
                //handle antivirus alerts
                fileBody = data.Body.toString();
                var foundSearchString = fileBody.search("" + antivirusSearchString + "");
                if (foundSearchString === -1) {
                    console.log("Search string not found in " + srcKey + " antivirus logs.");
                }
                else {
                    var lines = fileBody.split('\n');
                    var found;
                    for (var i = 0; i < lines.length; i++) {

                        found = lines[i].search("" + antivirusSearchString + "");
                        if (found >= 0) {
                            antivirusAlertDetails += "" + lines[i] + "\n";
                            antivirusAlertFound = true;
                            if (hostname === undefined) {
                                publish("filename: " + currentFilename + ": " + lines[i]);
                                publish("srckey:" + srcKey + " ")
                            } else {
                                publish("hostname: " + hostname + ": " + lines[i]);
                            }
                        }
                    }
                }
            }
            catch (e) {
                console.trace(e);
            }
        }

        //Check alert data in consolidated file
        function checkAlertsOld(data) {
            var JSONparsed;
            try {
                consolidatedFileBody = data.Body.toString();
                JSONparsed = JSON.parse(consolidatedFileBody);
                var srcJSONinConsolidated = JSONparsed[srcKey];
                diskUsageConsolidated = srcJSONinConsolidated[harddiskName];
                fireWallStatusConsolidated = srcJSONinConsolidated[firewallName];
                battery1Consolidated = srcJSONinConsolidated[batteryName1];      //batterystatus1
                battery2Consolidated = srcJSONinConsolidated[batteryName2];      //batterystatus2
            }
            catch (e) {
                console.trace(e);
                //retry reading src file.
                setTimeout(checkAlertsOld, 200);
            }

            if (consolidatedFileBody === undefined) {
                context.fail(null, "fileBody undefined, cannot read consolidated file");
            }
            if (JSONparsed === undefined || srcJSONinConsolidated === undefined) {
                context.fail(null, "Consolidated could not be parsed as JSON");
            }

            //Check Old Battery Status
            if (battery1Consolidated === undefined || battery2Consolidated === undefined) {
                context.fail(null, "batteryStatus not defined for old file in consolidated or batteryName mismatch in config.json");
            }
            else {
                oldBatteryStatus = (battery1Consolidated / battery2Consolidated) * 100;
                if (oldBatteryStatus <= batteryVal) {
                    oldBatteryAlert = true;
                } else {
                    oldBatteryAlert = false;
                }
            }

            //Check Old Firewall Status
            if (fireWallStatusConsolidated === undefined) {
                context.fail(null, "firewallStatus not defined for old file in consolidated or firewallName mismatch in config.json");
            }
            else {
                oldFirewallStatus = fireWallStatusConsolidated;
            }

            //Check Old Disk Usage
            if (diskUsageConsolidated === undefined) {
                context.fail(null, "diskUsage not defined for consolidated file or harddiskName mismatch in config.json");
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
            var JSONparsed;
            try {
                var fileBody = data.Body.toString();
                JSONparsed = JSON.parse(fileBody);
                srcDiskUsageString = JSONparsed[harddiskName];
                srcFirewallStatus = JSONparsed[firewallName];
                srcBattery = JSONparsed[batteryName];    //batterycycles
                srcBattery0 = JSONparsed[batteryName0];  //batteryhealth
                srcBattery1 = JSONparsed[batteryName1];  //batterystatus1
                srcBattery2 = JSONparsed[batteryName2];  //batterystatus2
                hostName = JSONparsed[hostNm]; //hostname
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
                //attempt to get the information one more time...
                publish("batteryStatus not defined for " + srcKey + " or batteryStatusName mismatch in config.json");
            }
            else {
                srcBatteryStatus = (srcBattery1 / srcBattery2) * 100;
                if (srcBatteryStatus <= batteryVal) {
                    newBatteryAlert = true;
                } else {
                    newBatteryAlert = false;
                }
            }

            //Check source file firewallStatus
            if (srcFirewallStatus === undefined) {
                console.log("firewallstatus not defined for " + srcKey + " or firewallName mismatch in config.json");
            }
            else {
                newFirewallStatus = srcFirewallStatus;
            }

            //Check source file diskUsage
            if (srcDiskUsageString === undefined) {
                publish("diskStatus not defined for " + srcKey + " or diskStatusName mismatch in config.json");
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
                    } else {
                        newDiskAlert = false;
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