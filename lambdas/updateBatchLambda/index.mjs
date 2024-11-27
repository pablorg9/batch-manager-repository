import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function updateSingleRecord(
    tableName,
    key,
    updateExpression,
    expressionAttributeValues,
    expressionAttributeNames
) {
    const params = {
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        const result = await docClient.send(new UpdateCommand(params));
        return result;
    } catch (error) {
        console.error(
            `Unable to update item. Error JSON: ${JSON.stringify(
                error,
                null,
                2
            )}`
        );
        throw error;
    }
}

async function updateMultipleRecords(tableName, requestData) {
    const updatePromises = requestData.map(async (req) => {
        const params = {
            TableName: tableName,
            Key: req.key,
            UpdateExpression: req.updateExpression,
            ExpressionAttributeValues: req.expressionAttributeValues,
            ExpressionAttributeNames: req.expressionAttributeNames,
            ReturnValues: 'UPDATED_NEW',
        };

        try {
            return await docClient.send(new UpdateCommand(params));
        } catch (error) {
            console.error(
                `Unable to update item. Error JSON: ${JSON.stringify(
                    error,
                    null,
                    2
                )}`
            );
            return null;
        }
    });

    return Promise.all(updatePromises);
}

const getItemByKey = async (tableName, primaryKey, primaryKeyValue, rangeKey, rangeKeyValue) => {
    const getParams = {
        TableName: tableName,
        Key: {
            [primaryKey]: primaryKeyValue,
            [rangeKey]: rangeKeyValue
        }
    };

    try {
        const data = await docClient.send(new GetCommand(getParams));
        return data.Item;
    } catch (err) {
        console.error('Error obteniendo el ítem:', err);
        throw err;
    }
};

export const handler = async (event) => {

    try {
        const { batchId, failedItems, requestsId, itemIds } = event;

        const batchTable = process.env.BATCH_TABLE;

        const batchTableKey = {
            batchId
        };

        const getBatch = await getItemByKey(process.env.BATCH_TABLE, 'batchId', batchId, 'shop', shop);
        let status = 'RUNNING';
        let incrementCurrentBatch = 1;

        if (getBatch.currentBatch === getBatch.totalBatch) {
            status = 'COMPLETED';
            incrementCurrentBatch = 0;
        }

        const singleUpdateExpression =
            'SET #st = :itemStatus, failedRequestItems = list_append(failedRequestItems, :failedRequestItems), totalFailedItems = totalFailedItems + :totalFailedItems, totalSuccessItems = totalSuccessItems + :totalSuccessItems ADD currentBatch :incrementCurrentBatch';
        const singleExpressionAttributeValues = {
            ':itemStatus': status,
            ':incrementCurrentBatch': incrementCurrentBatch,
            ':failedRequestItems': failedItems.map((item) => item.itemId),
            ':totalFailedItems': failedItems.length,
            ':totalSuccessItems': !products.length ? 0 : (products.length - failedItems.length),
        };
        const singleExpressionAttributeNames = {
            '#st': 'status',
        };
        

        const singleUpdateResponse = await updateSingleRecord(
            batchTable,
            batchTableKey,
            singleUpdateExpression,
            singleExpressionAttributeValues,
            singleExpressionAttributeNames
        );
        console.log(
            `Single update response: ${JSON.stringify(
                singleUpdateResponse,
                null,
                2
            )}`
        );
        const failedItemIds = failedItems.map((item) => item.itemId);
        const requestData = requestsId.map((request) => ({
            key: request,
            updateExpression: 'SET #st = :itemStatus, message = :errorMessages',
            expressionAttributeValues: {
                ':itemStatus': failedItemIds.includes(request.itemId)
                    ? 'FAILED'
                    : 'SUCCESSFUL',
                ':errorMessages': failedItemIds.includes(request.itemId)
                    ? failedItems.find((item) => item.itemId === request.itemId)
                        .errorMessages
                    : {},
            },
            expressionAttributeNames: {
                '#st': 'status',
            },
        }));
        await updateMultipleRecords(
            process.env.REQUEST_TABLE,
            requestData
        );

        return {
            statusCode: 200,
            message: `Batch completed: ${batchId} - ${getBatch.currentBatch}`,
        };
    } catch (error) {
        throw JSON.stringify({
                message: error?.message,
                details: error.response ? error.response?.data : null,
                fullError: JSON.stringify(error)
            })
    }
};
