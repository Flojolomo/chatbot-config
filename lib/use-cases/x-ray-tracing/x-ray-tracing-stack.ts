import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class XRayTracingStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // API Gateway
    // EventBridge
    // SQS
    // Lambda
    // SNS
  }
}
