import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const client = new SQSClient({ region: "us-east-1" });

export async function handler(event) {
    const queueUrl = process.env.INTEGRATION_SQS;
    const body = JSON.parse(event.body);

    try {
        const command = new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: event.body,
            MessageGroupId: body.batchId,
            MessageDeduplicationId: body.requestMessageId
        });

        await client.send(command);

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify('Message sent to SQS!')
        };
    } catch (error) {
        console.error('Error sending message to SQS:', error);

        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify('Error sending message to SQS.')
        };
    }
}
