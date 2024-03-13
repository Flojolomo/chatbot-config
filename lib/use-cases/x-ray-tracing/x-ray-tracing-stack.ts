import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
// Import the missing sqs module
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
// import * as apigatewayv2 from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
// Import the missing iam module

export class XRayTracingStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const api = new apigatewayv2.HttpApi(this, 'rest-api', {});

    this.createEventBus();
    // this.forwardPostRequests(api, eventBus);

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
    api: apigatewayv2.IHttpApi,
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
      api,
      apiGatewayRole,
      eventBus,
    );

    new apigatewayv2.CfnRoute(this, 'event-route', {
      apiId: api.apiId,
      routeKey: 'POST /event/',
      target: `integrations/${eventBridgeIntegration.ref}`,
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

  private createIntegration(
    { apiId }: apigatewayv2.IHttpApi,
    { roleArn }: iam.IRole,
    { eventBusArn }: events.IEventBus,
  ): apigatewayv2.CfnIntegration {
    return new apigatewayv2.CfnIntegration(this, 'event-bus-integration', {
      apiId: apiId,
      integrationType: apigatewayv2.HttpIntegrationType.AWS_PROXY,
      integrationSubtype:
        apigatewayv2.HttpIntegrationSubtype.EVENTBRIDGE_PUT_EVENTS,
      connectionType: apigatewayv2.HttpConnectionType.INTERNET,
      credentialsArn: roleArn,
      requestParameters: {
        Source: 'com.mycompany.$request.path.source',
        DetailType: '$request.path.detailType',
        Detail: '$request.body',
        EventBusName: eventBusArn,
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
