import { server } from './server';
import { bucket } from './bucket';

const firehoseAssumeRole = aws.iam.getPolicyDocument({
    statements: [{
        effect: "Allow",
        principals: [{
            type: "Service",
            identifiers: ["firehose.amazonaws.com"],
        }],
        actions: ["sts:AssumeRole"],
    }],
});
const firehoseRole = new aws.iam.Role("firehose_role", {
    name: "firehose_test_role",
    assumeRolePolicy: firehoseAssumeRole.then(firehoseAssumeRole => firehoseAssumeRole.json),
});

const cloudwatchLogsAssumeRole = aws.iam.getPolicyDocument({
    statements: [{
        effect: "Allow",
        principals: [{
            type: "Service",
            identifiers: ["logs.amazonaws.com"],
        }],
        actions: ["sts:AssumeRole"],
    }],
});

export const logStream = new aws.kinesis.FirehoseDeliveryStream("LogStream", {
    name: "demo-log-stream",
    destination: "extended_s3",
    extendedS3Configuration: {
        roleArn: firehoseRole.arn,
        bucketArn: bucket.arn,
        bufferingSize: 64,
        dynamicPartitioningConfiguration: {
            enabled: true,
        },
        prefix: "data/year=!{partitionKeyFromQuery:year}/month=!{partitionKeyFromQuery:month}/day=!{partitionKeyFromQuery:day}/",
        errorOutputPrefix: "errors/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/",
        processingConfiguration: {
            enabled: true,
            processors: [
                {
                    type: "RecordDeAggregation",
                    parameters: [{
                        parameterName: "SubRecordType",
                        parameterValue: "JSON",
                    }],
                },
                {
                    type: "AppendDelimiterToRecord",
                },
                {
                    type: "MetadataExtraction",
                    parameters: [
                        {
                            parameterName: "MetadataExtractionQuery",
                            parameterValue: ".timestamp | split(\"T\")[0] | split(\"-\") | {year: .[0], month: .[1], day: .[2]}",
                        },
                        {
                            parameterName: "JsonParsingEngine",
                            parameterValue: "JQ-1.6",
                        },
                    ],
                },
            ],
        },
    },
});

const cloudwatchLogsRole = new aws.iam.Role("cloudwatch_logs_role", {
    name: "cloudwatch_logs_firehose_role",
    assumeRolePolicy: cloudwatchLogsAssumeRole.then(policy => policy.json),
    inlinePolicies: [{
        name: "firehose-put-policy",
        policy: logStream.arn.apply(streamArn =>
            aws.iam.getPolicyDocument({
                statements: [{
                    effect: "Allow",
                    actions: [
                        "firehose:PutRecord",
                        "firehose:PutRecordBatch",
                    ],
                    resources: [streamArn],
                }],
            }).then(policy => policy.json)
        ),
    }],
});

export const logSubscriptionFilter = new aws.cloudwatch.LogSubscriptionFilter("LogSubscriptionFilter", {
    name: "log-subscription-filter",
    logGroup: server.nodes.logGroup.name,
    filterPattern: "",
    destinationArn: logStream.arn,
    roleArn: cloudwatchLogsRole.arn,
});