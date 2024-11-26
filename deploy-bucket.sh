aws cloudformation deploy \
    --stack-name s3-bucket-stack \
    --template-file ./cf-templates/bucket-template-cf.yaml \
    --capabilities CAPABILITY_NAMED_IAM \
    --profile personal   \
    --parameter-overrides IAMUserName=batch-manager-user
