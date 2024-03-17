import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway'; // Import the necessary module
import * as iam from 'aws-cdk-lib/aws-iam'; // Import the necessary module
import * as events from 'aws-cdk-lib/aws-events'; // Import the necessary module
import * as lambda from 'aws-cdk-lib/aws-lambda'; // Import the necessary module

export class Api extends Construct {
  public readonly api: apigateway.RestApi;

  private readonly role: iam.Role;

  public constructor(scope: Construct, id: string) {
    super(scope, id);

    this.api = new apigateway.RestApi(this, 'rest-api', {
      deploy: true,
      deployOptions: {
        tracingEnabled: true,
      },
    });

    // IAM Role for API Gateway to publish to EventBridge
    this.role = new iam.Role(this, 'api-gateway-role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
  }

  public sendPostToEventBus({
    eventBus,
    path,
    source,
  }: {
    eventBus: events.IEventBus;
    path: string;
    source: string;
  }) {
    // Grant the API Gateway permission to put events to the EventBridge
    eventBus.grantPutEventsTo(this.role);

    // Integration options for connecting the API Gateway to EventBridge
    const eventBusIntegration = this.createEventBusIntegration({
      eventBus,
      role: this.role,
      source,
    });

    // Define the method response
    const methodResponse = {
      statusCode: '200',
      responseModels: {
        'application/json': apigateway.Model.EMPTY_MODEL,
      },
    };

    this.api.root.addResource(path).addMethod('POST', eventBusIntegration, {
      methodResponses: [methodResponse],
    });
  }

  public integrateLambda({
    lambdaFunction,
    method,
    path,
  }: {
    lambdaFunction: lambda.IFunction;
    method: string;
    path: string;
  }): void {
    this.api.root
      .addResource(path)
      .addMethod(method, new apigateway.LambdaIntegration(lambdaFunction));
  }

  // eslint-disable-next-line max-lines-per-function
  private createEventBusIntegration({
    eventBus,
    role,
    source,
  }: {
    eventBus: events.IEventBus;
    role: iam.IRole;
    source: string;
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
              "Source":"${source}"
            }
          ]
        }
      `,
        },
      },
    });
  }
}
