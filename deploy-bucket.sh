#!/bin/sh
IAM_USER="${1:-batch-manager-user}"

aws cloudformation deploy \
    --stack-name s3-bucket-stack \
    --template-file ./cf-templates/bucket-template-cf.yaml \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides IAMUserName=$IAM_USER
