# Batch Manager Repository

This project is a batch processing system, it uses AWS services, including Lambda, Step Functions, DynamoDB, and S3, orchestrated by AWS CloudFormation

## Project Overview

The purpose of this project is to allow customization of processTask1Lambda and processTask2Lambda to handle any processing logic you require. You can use this project as a template if you need to process data in batches. The project manages the state machine and batch data for you

## Architecture

### Diagram

![batch-manager-repository](/docs/imgs/batch-manager-repository.drawio.png)

### Project Structure

```bash
batch-manager-repository/
├── lambdas/
│   ├── stateMachineInitLambda/
│   │   ├── index.js
│   │   └── package.json
│   ├── processTask1Lambda/
│   │   ├── index.js
│   │   └── package.json
│   ├── processTask2Lambda/
│   │   ├── index.js
│   │   └── package.json
│   └── updateBatchLambda/
│       ├── index.js
│       └── package.json
├── cf-templates/
│   ├── s3-stack.yaml
│   └── batch-processing-stack.yaml
├── deploy-bucket.sh
├── .gitignore
├── deploy.sh
└── README.md
```

### AWS Services Used

-   **AWS Lambda**: Functions to handle batch initialization, task processing, and batch updates
-   **AWS Step Functions**: State machine to orchestrate the execution flow of the batch processing
-   **Amazon DynamoDB**: Database for storing batch and request data
-   **Amazon S3**: Storage for the code for multiple lambdas functions
-   **Api Gateway**: To call the stateMachineInitLambda

### Lambda Functions

1. **`stateMachineInitLambda`**

    - **Purpose**: Starts the batch process receiving a POST HTTP request.
    - **Input**: Batch data via HTTP request
        - Body example: 
            ```json
                {
                    "batchId": "4b4dc5c6-fbd9-493d-98ff-c459c378f45d",
                    "totalItems": 10,
                    "batchSize": 5,
                    "currentBatch": 1,
                    "itemIds": [
                        "e9837419-9625-417c-b50f-facdb533ced0",
                        "f72885f8-e03c-4575-a28a-835e201b6851",
                        "bb45e4b0-e832-437a-94d2-ea62a09988c0",
                        "cb179cd1-5806-4b9a-b48a-2e4e8f41f8ec",
                        "e567baa3-05be-4f2e-ae8a-ed06f06467e4",
                        "0dcb25e6-961e-436e-8faf-dc96a9a8e903",
                        "0c1d9a87-242c-49bb-aa2f-adae62cced1f",
                        "95155ab4-8fe9-41af-aae6-820af51b071c",
                        "d8ea62dc-4d09-441a-b11f-f706d6591b43",
                        "178e15d7-d319-4d5c-aecd-d871b624e680"
                    ]
                }
            ```
    - **Output**: Trigger state machine with the batch information and response 200 status code to the user

2. **`processTask1Lambda`**

    - **Purpose**: Processes the first task in the batch and passes the result to the next step
    - **Input**: Event payload from state machine
    - **Output**: Updated event data for the next step in the state machine

3. **`processTask2Lambda`**

    - **Purpose**: Processes the second task in the batch and passes the result to the next step
    - **Input**: Event payload from state machine
    - **Output**: Updated event data for the next step in the state machine

4. **`updateBatchLambda`**
    - **Purpose**: Updates the `BatchTable` and `RequestTable` in DynamoDB with the latest information
    - **Input**: Event payload from state machine
    - **Output**: Batch completed

### DynamoDB Tables

-   **`BatchTable`**: Stores metadata and status of each batch.
-   **`RequestTable`**: Tracks individual requests associated with batches.

### CloudFormation Templates

1. **bucket-template-cf**:

    - Deploys an S3 bucket used in the project to store the code for multiple Lambda functions

2. **template-cf**:
    - Deploys:
        - The Step Functions state machine
        - Api gateway
        - All Lambda functions
        - DynamoDB tables for batch and request management

## Prerequisites

To deploy and run this project, you will need:

-   AWS account with access to deploy CloudFormation stacks
-   AWS user with the following policies:

    ![Policies](/docs/imgs/policies.png)
-   AWS CLI installed and set up for the user with the previously created policies
-   Node.js v20 installed for packaging Lambda functions

## Deployment

1. Clone this repository:
    ```bash
    git clone https://github.com/pablorg9/batch-manager-repository.git
    cd batch-manager-repository
    ```
2. Install dependencies: run `npm i` inside all lambdas
3. AWS CLI: to setup the CLI run the following command:
    ```bash
    aws configure
    ```
4. Deploy bucket: run `sh deploy-bucket.sh <YOUR-IAM-USER>` to deploy the bucket where we will store the lambda's code. Replace `<YOUR-IAM-USER>` with the user with all the policies required
5. Deploy template-cf: to deploy the lambdas, dynamo and step function, you will have to run the following command:

    ```bash
    sh deploy.sh stack build
    ```

**NOTE:** make sure you're configure the user with all policies required

**NOTE:** in case you want to change the lambdas processTask1 or processTask2 code and you want to deploy your changes you'll have to run the following command to update their code

```bash
sh deploy.sh lambdas build
```

## Usage

1. Trigger the stateMachineInitLambda using an HTTP client like Postman or curl:

    ```bash
    curl --location '<api-gateway-endpoint>/stateMachineInit'
    -H "Content-Type: application/json"
    -d '{
        "batchId": "4b4dc5c6-fbd9-493d-98ff-c459c378f45d",
        "totalItems": 10,
        "batchSize": 5,
        "currentBatch": 1,
        "itemIds": ["e9837419-9625-417c-b50f-facdb533ced0",
                    "f72885f8-e03c-4575-a28a-835e201b6851",
                    "bb45e4b0-e832-437a-94d2-ea62a09988c0",
                    "cb179cd1-5806-4b9a-b48a-2e4e8f41f8ec",
                    "e567baa3-05be-4f2e-ae8a-ed06f06467e4",
                    "0dcb25e6-961e-436e-8faf-dc96a9a8e903",
                    "0c1d9a87-242c-49bb-aa2f-adae62cced1f",
                    "95155ab4-8fe9-41af-aae6-820af51b071c",
                    "d8ea62dc-4d09-441a-b11f-f706d6591b43",
                    "178e15d7-d319-4d5c-aecd-d871b624e680"]
    ```
2. Monitor the batch processing in the Step Functions console. It should looks like this:

![StateMachine](/docs/imgs/state-machine.png)

3. Check the status and updates in the BatchTable and RequestTable DynamoDB tables

**NOTE:** you can get `<api-gateway-endpoint>` from api gateway on aws or you can look at the outputs in the template-cf stack in cloudformation
