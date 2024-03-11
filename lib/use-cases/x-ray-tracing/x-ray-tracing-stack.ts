import * as cdk from 'aws-cdk-lib';
import * as apiGateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as events from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs'; // Import the missing sqs module
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export class XRayTracingStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new apiGateway.HttpApi(this, 'http-api', {});
    new events.EventBus(this, 'event-bus', {});
    new sqs.Queue(this, 'queue', {});
    new NodejsFunction(this, 'lambda', {});
    new sns.Topic(this, 'topic', {});
  }
}
