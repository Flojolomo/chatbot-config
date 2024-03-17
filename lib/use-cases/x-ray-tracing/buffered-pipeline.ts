import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { LambdaFunction } from './lambda-function';
import path = require('path');
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources'; // Import the missing module
import * as sns from 'aws-cdk-lib/aws-sns'; // Import the missing module
import * as events from 'aws-cdk-lib/aws-events'; // Import the missing module
import * as eventTargets from 'aws-cdk-lib/aws-events-targets'; // Import the missing module

export class BufferedPipeline extends Construct {
  private readonly insertionQueue: sqs.Queue;
  public constructor(scope: Construct, id: string) {
    super(scope, id);

    const insertionQueue = new sqs.Queue(this, 'insertion-queue', {});
    const debufferingQueue = new sqs.Queue(this, 'debuffering-queue', {});
    const target = new sns.Topic(this, 'target', {});

    const insertionHandler = new LambdaFunction(this, 'insertion-handler', {
      entry: path.join(__dirname, 'lambda', 'queue-insertion-handler.ts'),
      environment: {
        QUEUE_URL: debufferingQueue.queueUrl,
      },
    });

    debufferingQueue.grantSendMessages(insertionHandler);
    insertionHandler.addEventSource(
      new lambdaEventSources.SqsEventSource(insertionQueue),
    );

    const processingHandler = new LambdaFunction(this, 'processing-handler', {
      entry: path.join(__dirname, 'lambda', 'queue-processing-handler.ts'),
      environment: {
        TOPIC_ARN: target.topicArn,
      },
    });

    processingHandler.addEventSource(
      new lambdaEventSources.SqsEventSource(debufferingQueue),
    );

    target.grantPublish(processingHandler);
    this.insertionQueue = insertionQueue;
  }

  public subscribeToEventBus({
    eventBus,
    sources,
  }: {
    eventBus: events.IEventBus;
    sources: string[];
  }) {
    new events.Rule(this, 'event-bus-rule', {
      eventBus,
      eventPattern: {
        source: sources,
      },
    }).addTarget(new eventTargets.SqsQueue(this.insertionQueue));
  }
}
