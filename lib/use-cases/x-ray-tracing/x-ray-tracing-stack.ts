import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import path = require('path');
import * as sns from 'aws-cdk-lib/aws-sns'; // Import the missing sns module
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

// TODO event stream
// Vermutlich hängt das mit dem Transformer zusammen.
// Import the missing iam module
// TODO open API Spec
//aws.amazon.com/blogs/compute/using-aws-x-ray-tracing-with-amazon-eventbridge/
export class XRayTracingStack extends cdk.Stack {
  private static readonly API_SOURCE = 'api.rest.public';
  // eslint-disable-next-line max-lines-per-function
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Only REST APIs support tracing
    const api = new apigateway.RestApi(this, 'rest-api', {
      deploy: true,
      deployOptions: {
        tracingEnabled: true,
      },
    });

    const { eventBus } = this.createEventBus();
    this.forwardPostRequests({ api, eventBus });
    this.forwardPostRequestsViaLambda({ api, eventBus });

    const queue = new sqs.Queue(this, 'queue', {});
    new events.Rule(this, 'queue-rule', {
      eventBus,
      eventPattern: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        source: [{ prefix: XRayTracingStack.API_SOURCE } as any],
      },
    }).addTarget(new eventTargets.SqsQueue(queue));

    const topic = new sns.Topic(this, 'topic', {});
    const table = new dynamodb.Table(this, 'table', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const lambdaFunction = this.createLambdaFunction({
      eventBus,
      queue,
      topic,
      table,
    });

    new events.Rule(this, 'queue-rule', {
      eventBus,
      eventPattern: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        source: [XRayTracingStack.API_SOURCE, 'application.lambda'],
      },
    }).addTarget(new eventTargets.SqsQueue(queue));
    lambdaFunction.addEventSource(new lambdaEventSources.SqsEventSource(queue));

    // Can we trace dynamodb streams?
  }

  // eslint-disable-next-line max-lines-per-function
  private forwardPostRequests({
    api,
    eventBus,
  }: {
    api: apigateway.IRestApi;
    eventBus: events.IEventBus;
  }) {
    // IAM Role for API Gateway to publish to EventBridge
    const apiGatewayRole = new iam.Role(this, 'ApiGatewayRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    // Grant the API Gateway permission to put events to the EventBridge
    eventBus.grantPutEventsTo(apiGatewayRole);

    // Integration options for connecting the API Gateway to EventBridge
    const eventBusIntegration = this.createEventBusIntegration({
      role: apiGatewayRole,
      eventBus,
    });

    // Define the method response
    const methodResponse = {
      statusCode: '200',
      responseModels: {
        'application/json': apigateway.Model.EMPTY_MODEL,
      },
    };

    // const options = { methodResponses: [{ statusCode: '200' }] };
    api.root.addResource('event').addMethod('POST', eventBusIntegration, {
      methodResponses: [methodResponse],
    });
  }

  // eslint-disable-next-line max-lines-per-function
  private forwardPostRequestsViaLambda({
    api,
    eventBus,
  }: {
    api: apigateway.IRestApi;
    eventBus: events.IEventBus;
  }) {
    const lambdaFunction = new lambdaNodeJs.NodejsFunction(this, 'api-lambda', {
      entry: path.join(__dirname, 'lambda', 'api-handler.ts'),
      environment: {
        POWERTOOLS_SERVICE_NAME: 'x-ray-showcase',
        POWERTOOLS_TRACE_ENABLED: String(true),
        POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: String(true),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: String(true),
        POWERTOOLS_TRACER_CAPTURE_ERROR: String(true),
        POWERTOOLS_LOG_LEVEL: 'DEBUG',
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      runtime: lambda.Runtime.NODEJS_20_X,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    eventBus.grantPutEventsTo(lambdaFunction);

    // Define the method response
    const methodResponse = {
      statusCode: '200',
      responseModels: {
        'application/json': apigateway.Model.EMPTY_MODEL,
      },
    };

    api.root
      .addResource('event-via-lambda')
      .addMethod('POST', new apigateway.LambdaIntegration(lambdaFunction), {
        methodResponses: [methodResponse],
      });
  }

  private createEventBus(): {
    eventBus: events.IEventBus;
    logGroup: logs.LogGroup;
  } {
    const eventBus = new events.EventBus(this, 'event-bus', {});
    const { logGroup } = this.forwardEventsToLogGroup(eventBus);

    return { eventBus, logGroup };
  }

  // eslint-disable-next-line max-lines-per-function
  private createLambdaFunction({
    eventBus,
    queue,
    topic,
    table,
  }: {
    eventBus: events.IEventBus;
    queue: sqs.IQueue;
    topic: sns.ITopic;
    table: dynamodb.ITable;
  }): lambda.Function {
    const lambdaFunction = new lambdaNodeJs.NodejsFunction(this, 'lambda', {
      entry: path.join(__dirname, 'lambda', 'handler.ts'),
      environment: {
        POWERTOOLS_SERVICE_NAME: 'x-ray-showcase',
        POWERTOOLS_TRACE_ENABLED: String(true),
        POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: String(true),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: String(true),
        POWERTOOLS_TRACER_CAPTURE_ERROR: String(true),
        POWERTOOLS_LOG_LEVEL: 'DEBUG',
        TOPIC: topic.topicArn,
        TABLE: table.tableName,
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
      runtime: lambda.Runtime.NODEJS_20_X,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    // lambdaFunction.logGroup?.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    table.grantReadWriteData(lambdaFunction);
    topic.grantPublish(lambdaFunction);
    eventBus.grantPutEventsTo(lambdaFunction);
    lambdaFunction.addEventSource(new lambdaEventSources.SqsEventSource(queue));

    return lambdaFunction;
  }

  // eslint-disable-next-line max-lines-per-function
  private createEventBusIntegration({
    eventBus,
    role,
  }: {
    role: iam.IRole;
    eventBus: events.IEventBus;
  }): apigateway.AwsIntegration {
    return new apigateway.AwsIntegration({
      service: 'events',
      action: 'PutEvents',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: role,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{ "requestId": "$context.requestId" }`,
            },
          },
        ],
        requestTemplates: {
          'application/json': `
        #set($context.requestOverride.header.X-Amz-Target = "AWSEvents.PutEvents")
        #set($context.requestOverride.header.Content-Type = "application/x-amz-json-1.1")            
        { 
          "Entries": [
            {
              "Detail": "$util.escapeJavaScript($input.body)",
              "DetailType": "request",
              "EventBusName": "${eventBus.eventBusName}",
              "Source":"${XRayTracingStack.API_SOURCE}"
            }
          ]
        }
      `,
        },
      },
    });
  }

  private forwardEventsToLogGroup(eventBus: events.EventBus): {
    logGroup: logs.LogGroup;
  } {
    const eventLoggerRule = new events.Rule(this, 'rule', {
      description: 'Log all events',
      eventPattern: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        source: [{ prefix: '' }] as any[],
      },
      eventBus: eventBus,
    });

    const logGroup = new logs.LogGroup(this, 'log-group', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    eventLoggerRule.addTarget(new eventTargets.CloudWatchLogGroup(logGroup));

    return { logGroup };
  }
}
