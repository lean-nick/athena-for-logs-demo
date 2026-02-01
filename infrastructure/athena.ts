import { bucket, queryResultsBucket } from './bucket'

export const logDatabase = new aws.glue.CatalogDatabase("LogCatalogDatabase", {
    name: `log_catalog_db_${$app.stage}`,
});

export const athenaWorkgroup = new aws.athena.Workgroup("AthenaWorkgroup", {
    name: `logs-workgroup-${$app.stage}`,
    state: "ENABLED",
    configuration: {
        resultConfiguration: {
            outputLocation: queryResultsBucket.arn.apply(arn =>
                `s3://${arn.split(":::")[1]}/query-results/`
            ),
        },
        enforceWorkgroupConfiguration: false,
    },
});

export const table = new aws.glue.CatalogTable("AppLogsTable", {
    name: `logs_table_${$app.stage}`,
    databaseName: logDatabase.name,
    tableType: "EXTERNAL_TABLE",
    parameters: {
        "classification": "parquet", // Changed from json
    },
    // parameters: {
    //     "classification": "json",
    //     "projection.enabled": "true",
    //     "projection.year.type": "integer",
    //     "projection.year.range": "2026,2031",
    //     "projection.month.type": "integer",
    //     "projection.month.range": "1,12",
    //     "projection.month.digits": "2",
    //     "projection.day.type": "integer",
    //     "projection.day.range": "1,31",
    //     "projection.day.digits": "2",
    //     "storage.location.template": bucket.arn.apply(arn =>
    //         `s3://${arn.split(":::")[1]}/data/year=\${year}/month=\${month}/day=\${day}/`
    //     ),
    // },
    storageDescriptor: {
        location: bucket.arn.apply(arn => `s3://${arn.split(":::")[1]}/data/`),
        inputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
        outputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
        serDeInfo: {
            name: "LzoParquetHiveSerDe",
            serializationLibrary: "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
        },
        columns: [
            { name: "timestamp", type: "string" },
            { name: "performance", type: "struct<duration_ms:bigint,memory_used:int>" },
            { name: "business", type: "struct<lifecycle:string>" },
            { name: "infrastructure", type: "struct<region:string>" },
            { name: "error", type: "struct<code:string,message:string>" },
            { name: "request", type: "struct<method:string,path:string>" },
        ],
    },
});