import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import path = require('path');
// Import the missing sns module
import { LambdaFunction } from './lambda-function';
// Import the missing lambdaEventSources module
import { EventBus } from './event-bus';
import { Api } from './api';

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

    const api = new Api(this, 'api');
    const { eventBus } = new EventBus(this, 'event-bus');
    const { handler: apiRequestHandler } = new LambdaFunction(
      this,
      'api-request-handler',
      {
        entry: path.join(__dirname, 'lambda', 'api-handler.ts'),
        environment: {
          EVENT_BUS_NAME: eventBus.eventBusName,
        },
      },
    );

    api.sendPostToEventBus({
      eventBus,
      path: 'event', // Should be /event
      source: 'api.rest.public',
    });

    api.integrateLambda({
      lambdaFunction: apiRequestHandler,
      method: 'POST',
      path: 'event',
    });

    // this.createBufferedProcessingPipeline({ eventBus });

    // Can we trace dynamodb streams?
  }

  // private createBufferedProcessingPipeline({
  //   eventBus,
  // }: {
  //   eventBus: events.IEventBus;
  // }) {
  //   const queue = new sqs.Queue(this, 'event-buffer', {});

  //   new events.Rule(this, 'queue-rule', {
  //     eventBus,
  //     eventPattern: {
  //       source: [XRayTracingStack.API_SOURCE],
  //     },
  //   }).addTarget(new eventTargets.SqsQueue(queue));

  //   const { handler } = new LambdaFunction(this, 'queue-handler', {
  //     entry: path.join(__dirname, 'lambda', 'queue-handler.ts'),
  //     environment: {
  //       // TOPIC_ARN: topic.topicArn,
  //     },
  //   });

  //   handler.addEventSource(new lambdaEventSources.SqsEventSource(queue));
  // }

  // private createDirectProcessingPipeline({
  //   eventBus,
  // }: {
  //   eventBus: events.IEventBus;
  // }) {
  //   const { handler } = new LambdaFunction(this, 'queue-handler', {
  //     entry: path.join(__dirname, 'lambda', 'queue-handler.ts'),
  //     environment: {
  //       // TOPIC_ARN: topic.topicArn,
  //     },
  //   });

  //   new events.Rule(this, 'lambda-rule', {
  //     eventBus,
  //     eventPattern: {
  //       source: [XRayTracingStack.API_SOURCE],
  //     },
  //   }).addTarget(new eventTargets.LambdaFunction(handler));
  // }
}
