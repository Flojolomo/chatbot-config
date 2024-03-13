import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

// Import the missing iam module
// TODO open API Spec
//aws.amazon.com/blogs/compute/using-aws-x-ray-tracing-with-amazon-eventbridge/
export class XRayTracingStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Only REST APIs support tracing
    const api = new apigateway.RestApi(this, 'rest-api', {
      deploy: true,
      deployOptions: {
        tracingEnabled: true,
      },
    });
    // const api = new apigatewayv2.HttpApi(this, 'rest-api', {});

    const { eventBus } = this.createEventBus();
    this.forwardPostRequests(api, eventBus);

    // new sqs.Queue(this, 'queue', {});

    // new lambdaNodeJs.NodejsFunction(this, 'lambda', {
    //   entry: path.join(__dirname, 'lambda', 'handler.ts'),
    //   environment: {
    //     POWERTOOLS_SERVICE_NAME: 'x-ray-showcase',
    //     POWERTOOLS_TRACE_ENABLED: String(true),
    //     POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: String(true),
    //     POWERTOOLS_TRACER_CAPTURE_RESPONSE: String(true),
    //     POWERTOOLS_TRACER_CAPTURE_ERROR: String(true),
    //     POWERTOOLS_LOG_LEVEL: 'DEBUG',
    //   },
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   tracing: lambda.Tracing.ACTIVE,
    // });

    // new sns.Topic(this, 'topic', {});
    new dynamodb.Table(this, 'table', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    });
  }

  private forwardPostRequests(
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
    this.createIntegration({
      role: apiGatewayRole,
      eventBus,
    });

    api.root.addMethod('GET', new apigateway.MockIntegration({}));

    // const events = api.root.addResource('event');
    // const options = { methodResponses: [{ statusCode: '200' }] };

    // events.addMethod('POST', eventBridgeIntegration, options);
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
  private createIntegration({
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
          'application/x-www-form-urlencoded': `
        #set($context.requestOverride.header.X-Amz-Target = "AWSEvents.PutEvents")
        #set($context.requestOverride.header.Content-Type = "application/x-amz-json-1.1")            
        { 
          "Entries": [
            {
              "Detail": "{\\"message\\": \\"$util.escapeJavaScript($input.body).replaceAll("\\'","'")\\"}",
              "DetailType": "message",
              "EventBusName": "${eventBus.eventBusName}",
              "Source":"cdk.application.api.rest"
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
    const eventLoggerRule = new events.Rule(this, 'EventLoggerRule', {
      description: 'Log all events',
      eventPattern: {
        region: ['*'],
      },
      eventBus: eventBus,
    });

    const logGroup = new logs.LogGroup(this, 'EventLogGroup', {
      logGroupName: '/aws/events/MyEventBus',
    });

    eventLoggerRule.addTarget(new eventTargets.CloudWatchLogGroup(logGroup));

    return { logGroup };
  }
}
