#!/bin/sh
DEPLOY_TYPE="${1:-stack}"
BUILD="${2:-''}"

BUCKET_NAME="batch-manager-s3-bucket-stack"
STACK_NAME="batch-manager-stack"

if [ $BUILD == "build" ]; then
    rm -rf dist;
    mkdir dist;
    chmod 755 dist;

    for lambdaDir in lambdas/*; do
        if [ -d "$lambdaDir" ]; then
            lambdaName=$(basename "$lambdaDir")
            cd "$lambdaDir"
            zip -r "../../dist/${lambdaName}.zip" . >/dev/null
            echo "zipped: ${lambdaName}.zip"
            cd - >/dev/null
        fi
    done

    aws s3 cp ./dist s3://${BUCKET_NAME}/ --recursive
fi

if [ $DEPLOY_TYPE == "lambdas" ]; then
    echo "Deploying all lambdas..."
    for zipFile in dist/*.zip; do
        lambdaName=$(basename "$zipFile" .zip)
        aws lambda update-function-code \
            --function-name "${STACK_NAME}-${lambdaName}" \
            --s3-bucket "${BUCKET_NAME}" \
            --s3-key "${lambdaName}.zip"
        echo "Lambda deployed: ${lambdaName}"
    done
else
    echo "Deploying stack..."
    aws cloudformation deploy \
      --stack-name $STACK_NAME \
      --template-file ./cf-templates/template-cf.yaml \
      --capabilities CAPABILITY_NAMED_IAM
fi
