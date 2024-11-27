import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    BatchWriteCommand,
    PutCommand,
    DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const sfnClient = new SFNClient();

export const handler = async (event) => {
    const {batchId, totalItems, batchSize, currentBatch, items} = JSON.parse(event.body);

    try {
        if (currentBatch === 1) {
            const batchCommand = new PutCommand({
                TableName: process.env.BATCH_TABLE,
                Item: {
                    batchId: batchId,
                    totalItems: totalItems,
                    currentBatch: 1,
                    batchSize: batchSize,
                    totalBatch: Math.ceil(totalItems / batchSize),
                    failedRequestSkus: [],
                    totalFailedItems: 0,
                    totalSuccessItems: 0,
                    status: 'RUNNING',
                    timestamp: Date.now(),
                },
            });
    
            await docClient.send(batchCommand);
        }
    
        const putRequests = items.map((item) => ({
            PutRequest: {
                Item: {
                    requestId: uuidv4(),
                    batchId: batchId,
                    item: item,
                    message: {},
                    status: 'CREATED',
                    timestamp: Date.now(),
                },
            },
        }));
    
        const requestCommand = new BatchWriteCommand({
            RequestItems: {
                [process.env.REQUEST_TABLE]: putRequests,
            },
        });
    
        await docClient.send(requestCommand);
    
        const sfnParams = {
            stateMachineArn: process.env.STATE_MACHINE_ARN,
            input: JSON.stringify({
                items: items,
                batchId: batchId,
                currentBatch: currentBatch,
                requestsId: putRequests.map((request) => ({
                    requestId: request.PutRequest.Item.requestId,
                    item: request.PutRequest.Item.item,
                })),
            }),
        };
    
        const sfnCommand = new StartExecutionCommand(sfnParams);
        await sfnClient.send(sfnCommand);
    
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
                batchId,
                totalItems
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
                message: error?.message,
                details: error.response ? error.response?.data : null,
                fullError: JSON.stringify(error)
            })
        };
    }
};
