import * as cdk from 'aws-cdk-lib';
import * as apiGateway from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';

export class XRayTracingStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // API Gateway
    new apiGateway.HttpApi(this, 'HttpApi', {});
    // EventBridge
    // SQS
    // Lambda
    // SNS
  }
}
