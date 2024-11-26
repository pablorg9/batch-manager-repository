#!/bin/sh
DEPLOY_TYPE="${1:-stack}"
BUILD="${2}"

BUCKET_NAME="batch-manager-s3-bucket-stack"
STACK_NAME="batch-manager-stack"

if [ $BUILD == "build" ]; then
    rm -rf dist;
    mkdir dist;
    chmod 755 dist;
    cd lambdas/publishSQSLambda;
    zip -r ../../dist/publishSQSLambda.zip .
    cd ..
    cd ..
    aws s3 cp ./dist s3://${BUCKET_NAME}/ --recursive --profile personal
fi

if [ $DEPLOY_TYPE == "lambdas" ]; then
    echo "Deploying all lambdas"
    aws lambda update-function-code --function-name ${STACK_NAME}-publishSQSLambda --s3-bucket ${BUCKET_NAME} --s3-key publishSQSLambda.zip --profile personal
else
    echo "Deploying stack..."
    aws cloudformation deploy \
      --stack-name $STACK_NAME \
      --template-file ./cf-templates/template-cf.yaml \
      --profile personal \
      --capabilities CAPABILITY_NAMED_IAM
fi
