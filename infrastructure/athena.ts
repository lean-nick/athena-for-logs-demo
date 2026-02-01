import { bucket } from './bucket'

export const logDatabase = new aws.glue.CatalogDatabase("LogCatalogDatabase", {
    name: "log_catalog_db",
});

export const appLogsTable = new aws.glue.CatalogTable("AppLogsTable", {
    name: "logs_table",
    databaseName: logDatabase.name,
    tableType: "EXTERNAL_TABLE",
    parameters: {
        "classification": "json",
        "projection.enabled": "true",
        "projection.year.type": "integer",
        "projection.year.range": "2026,2031",
        "projection.month.type": "integer",
        "projection.month.range": "1,12",
        "projection.month.digits": "2",
        "projection.day.type": "integer",
        "projection.day.range": "1,31",
        "projection.day.digits": "2",
        "storage.location.template": bucket.arn.apply(arn =>
            `s3://${arn.split(":::")[1]}/data/year=\${year}/month=\${month}/day=\${day}/`
        ),
    },
    partitionKeys: [
        { name: "year", type: "string" },
        { name: "month", type: "string" },
        { name: "day", type: "string" },
    ],
    storageDescriptor: {
        location: bucket.arn.apply(arn => `s3://${arn.split(":::")[1]}/data/`),
        inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
        outputFormat: "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
        serDeInfo: {
            name: "json-serde",
            parameters: { "ignore.malformed.json": "true" },
        },
        columns: [
            { name: "timestamp", type: "string" },
            { name: "performance", type: "struct<duration_ms:double,memory_used:int>" },
            { name: "business", type: "struct<lifecycle:string>" },
            { name: "infrastructure", type: "struct<region:string>" },
            { name: "error", type: "struct<code:string,message:string>" },
            { name: "request", type: "struct<method:string,path:string>" },
        ],
    },
});


