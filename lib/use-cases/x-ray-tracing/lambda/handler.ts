import { Tracer } from '@aws-lambda-powertools/tracer';
import { LambdaInterface } from '@aws-lambda-powertools/commons/types';

import { Logger } from '@aws-lambda-powertools/logger';
import {
  BatchProcessor,
  EventType,
  processPartialResponse,
} from '@aws-lambda-powertools/batch';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
// import { PutEventsCommand } from '@aws-sdk/client-cloudwatch-events';
import { v4 } from 'uuid';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

const logger = new Logger({});
const tracer = new Tracer({});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dynamodbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const eventBusClient = tracer.captureAWSv3Client(new EventBridgeClient({}));

const processor = new BatchProcessor(EventType.SQS);

class Lambda implements LambdaInterface {
  // Set the log event flag to true
  // eslint-disable-next-line max-lines-per-function
  @tracer.captureLambdaHandler()
  @logger.injectLambdaContext({ logEvent: true })
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  public async handler(_event: SQSEvent, _context: unknown): Promise<void> {
    logger.info('This is an INFO log with some context');
    await processPartialResponse(
      _event,
      this.recordHandler.bind(this),
      processor,
    );
  }

  // eslint-disable-next-line max-lines-per-function
  private async recordHandler(record: SQSRecord) {
    logger.info('Processing event', { record });

    const body = JSON.parse(record.body!);
    await dynamodbClient.send(
      new PutItemCommand({
        TableName: process.env.TABLE!,
        Item: {
          id: { S: v4() },
          body: { S: record.body! },
        },
      }),
    );

    await eventBusClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source:
              body.source === 'application.lambda'
                ? 'none'
                : 'application.lambda',
            DetailType:
              body['detail-type'] === 'transformed' ? 'finish' : 'transformed',
            Detail: JSON.stringify(body.detail!),
            EventBusName: process.env.EVENT_BUS_NAME!,
          },
        ],
      }),
    );
  }
}

const myFunction = new Lambda();
export const handler = myFunction.handler.bind(myFunction);
