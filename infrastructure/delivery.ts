import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { bucket } from './bucket'
import { logDatabase, table } from './athena'
import { server } from "./server";

const firehoseRole = new aws.iam.Role(`firehose-role-${$app.stage}`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "firehose.amazonaws.com" }),
});

new aws.iam.RolePolicy(`firehose-policy-${$app.stage}`, {
    role: firehoseRole.id,
    policy: {
        Version: "2012-10-17",
        Statement: [
            {
                Action: ["s3:PutObject", "s3:GetBucketLocation", "s3:ListBucket"],
                Resource: [bucket.arn, pulumi.interpolate`${bucket.arn}/*`],
                Effect: "Allow"
            },
            {
                Action: ["glue:GetTable", "glue:GetTableVersion", "glue:GetDatabase"],
                Resource: [
                    pulumi.interpolate`arn:aws:glue:*:*:database/${logDatabase.name}`,
                    pulumi.interpolate`arn:aws:glue:*:*:table/${logDatabase.name}/*`,
                    pulumi.interpolate`arn:aws:glue:*:*:catalog`
                ],
                Effect: "Allow"
            },
            {
                Action: ["logs:PutLogEvents"],
                Resource: pulumi.interpolate`arn:aws:logs:*:*:log-group:/aws/kinesis/firehose/*`,
                Effect: "Allow"
            }
        ],
    },
});

const firehose = new aws.kinesis.FirehoseDeliveryStream(`logs-firehose-${$app.stage}`, {
    destination: "extended_s3",
    extendedS3Configuration: {
        bucketArn: bucket.arn,
        roleArn: firehoseRole.arn,
        cloudwatchLoggingOptions: {
            enabled: true,
            logGroupName: "/aws/kinesis/firehose/errors",
            logStreamName: "ExtractionErrors",
        },
        bufferingSize: 64,
        dynamicPartitioningConfiguration: { enabled: false },
        processingConfiguration: {
            enabled: true,
            processors: [
                {
                    type: "Decompression",
                    parameters: [{ parameterName: "CompressionFormat", parameterValue: "GZIP" }]
                },
                {
                    type: "CloudWatchLogProcessing",
                    parameters: [{
                        parameterName: "DataMessageExtraction",
                        parameterValue: "true"
                    }]
                }]
        },
        dataFormatConversionConfiguration: {
            enabled: true,
            inputFormatConfiguration: { deserializer: { openXJsonSerDe: {} } },
            outputFormatConfiguration: { serializer: { parquetSerDe: {} } },
            schemaConfiguration: {
                databaseName: logDatabase.name,
                tableName: table.name,
                roleArn: firehoseRole.arn,
            },
        },
    },
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

const cloudwatchLogsRole = new aws.iam.Role("cloudwatch_logs_role_brah", {
    name: "cloudwatch_logs_firehose_role_brah",
    assumeRolePolicy: cloudwatchLogsAssumeRole.then(policy => policy.json),
    inlinePolicies: [{
        name: "firehose-put-policy",
        policy: firehose.arn.apply(streamArn =>
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

export const logSubscriptionFilter = new aws.cloudwatch.LogSubscriptionFilter("LogSubscriptionFilterBrah", {
    name: "log-subscription-filter",
    logGroup: server.nodes.logGroup.name,
    filterPattern: "{ $.timestamp = * }",
    destinationArn: firehose.arn,
    roleArn: cloudwatchLogsRole.arn,
});