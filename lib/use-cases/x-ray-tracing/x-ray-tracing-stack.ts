import * as cdk from 'aws-cdk-lib';
import * as apiGateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as events from 'aws-cdk-lib/aws-events';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs'; // Import the missing sqs module
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import path = require('path');
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class XRayTracingStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new apiGateway.HttpApi(this, 'http-api', {});
    new events.EventBus(this, 'event-bus', {});
    new sqs.Queue(this, 'queue', {});

    new lambdaNodeJs.NodejsFunction(this, 'lambda', {
      entry: path.join(__dirname, 'lambda', 'handler.ts'),
      environment: {
        POWERTOOLS_SERVICE_NAME: 'x-ray-showcase',
        POWERTOOLS_TRACE_ENABLED: String(true),
        POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: String(true),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: String(true),
        POWERTOOLS_TRACER_CAPTURE_ERROR: String(true),
        POWERTOOLS_LOG_LEVEL: 'DEBUG',
      },
      runtime: lambda.Runtime.NODEJS_20_X,
      tracing: lambda.Tracing.ACTIVE,
    });

    new sns.Topic(this, 'topic', {});
    new dynamodb.Table(this, 'table', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    });
  }
}
