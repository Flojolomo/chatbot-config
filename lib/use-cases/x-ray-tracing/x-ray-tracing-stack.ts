import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs'; // Import the missing sqs module
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import path = require('path');
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
// Import the missing iam module

export class XRayTracingStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const eventBus = new events.EventBus(this, 'event-bus', {});
    const api = new apigateway.RestApi(this, 'rest-api', {
      deployOptions: {
        tracingEnabled: true,
      },
    });

    this.writePostRequestsTo(api, eventBus);

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

  private writePostRequestsTo(
    api: apigateway.IRestApi,
    eventBus: events.IEventBus,
  ) {
    // IAM Role for API Gateway to publish to EventBridge
    const apiGatewayRole = new iam.Role(this, 'ApiGatewayRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    // Grant the API Gateway permission to put events to the EventBridge
    eventBus.grantPutEventsTo(apiGatewayRole);

    // Integration options for connecting the API Gateway to EventBridge
    const eventBridgeIntegration = this.createIntegration(
      apiGatewayRole,
      eventBus,
    );

    // Add a POST method to the API Gateway, integrated with EventBridge
    const resource = api.root.addResource('event');
    resource.addMethod('POST', eventBridgeIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });
  }

  private createIntegration(
    apiGatewayRole: iam.IRole,
    eventBus: events.IEventBus,
  ): apigateway.AwsIntegration {
    return new apigateway.AwsIntegration({
      service: 'events',
      action: 'PutEvents',
      options: {
        credentialsRole: apiGatewayRole,
        requestTemplates: {
          'application/json': `{
            "Entries": [
              {
                "Source": "my.source",
                "DetailType": "myDetailType",
                "Detail": "$util.escapeJavaScript($input.json('$'))",
                "EventBusName": "${eventBus.eventBusName}"
              }
            ]
          }`,
        },
        integrationResponses: [
          {
            statusCode: '200',
          },
        ],
      },
    });
  }
}
