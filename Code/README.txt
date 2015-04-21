Instructions For Lambda Functions:
-----------------------------------
Lambda requires a "context" that all node.js code must be surrounded with in order to run.
Hence there are two different files for each piece of code. One is excluding the context for the 
purpose of being tested in an IDE, and the other has the context defined so that it can be 
uploaded to the Lambda Function List. All code that is added to GitHub with a "Lambda" suffix, 
(e.g. ConsolidateAuditFilesLambda) has already been uploaded to Lambda and configured for use on a bucket.

**********
IMPORTANT
**********
The node_modules/ folder in TestData/ contains the PubNub API, and as such it is NECESSARY to zip it (as a .zip) 
with any code that uses the PubNub API when uploaded to AWS S3. 

In order to test a given node.js code that has the Lambda suffix, go to the bucket you want to test the code in,
and click properties. Name the function, select the event it is triggered on (usually I test with Put), 
be sure to tick Send to: Lambda Function. 

Next we need to open the Lambda Function list (new tab) and get the Lambda Function ARN to be copy pasted into the
Lambda Function ARN box in the function properties. Underneath that there is the IAM Role ARN, which can be 
found by clicking the "IAM Console" link. Simply copy paste the ARN into the box and save once you confirm that 
the settings are what you want to test. 

Finally, upload a file into the bucket (Tests a Put or Object Created Event) and depending on the function there
are a couple different places to check the run results:

-ConsolidateAuditFilesLambda places a _consolidated.json file into the bucket.

-TriggerOnThresholdLambda writes alerts to the CloudWatch console depending on the put file.

-TriggerOnNewThresholdLambda writes alerts to the CloudWatch console depending on the put file and the old 
 file in the _consolidated.json.

 -TriggerNewPubNubAlertLambda sends a PubNub message to the publish key with the alert information depending on
 the put file and the old file in the _consolidated.json. You can also see "success" log in the CloudWatch alerts to 
 indicate that the message was send to PubNub.

 -TriggerNewPubNubAlertAndConfigLambda has the same functionality as the code above but also includes instructions
 that can read the _config.json file in the bucket to search the audit files for certain statistic names, 
 set the thresholds that will be alerted on, and each has an 'activated' field to turn on or off alerts for that 
 statistic.

 -TriggerNewPubNubConfigAndBatteryLambda has the same functionality as the code above but can also
 output battery alerts. 

 -TriggerOnHardiskThresholdIDE is the original harddisk trigger functionality from early sprints.

-TriggerOnAlertAndConsolidate is the original alerting code for harddisk and firewall.

-alertAntivirusLog checks for logs of the same name as the srcKey except with _log at the end,
 ex. "name"_log.json. Can configure search string in config.json.
 
-runMultipleTestLambda is the 'final' code that contains all functionalities listed above
 AND is tested to work on a batch upload. Has code to handle all error situations I encountered
 when running batch uploads, has many considerations for efficiency AND speed.