import { Tracer } from '@aws-lambda-powertools/tracer';
import { LambdaInterface } from '@aws-lambda-powertools/commons/types';

import { Logger } from '@aws-lambda-powertools/logger';
import { EventBridgeEvent } from 'aws-lambda';
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

class Lambda implements LambdaInterface {
  // Set the log event flag to true
  // eslint-disable-next-line max-lines-per-function
  @tracer.captureLambdaHandler()
  @logger.injectLambdaContext({ logEvent: true })
  public async handler(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _event: EventBridgeEvent<any, any>,
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    _context: unknown,
  ): Promise<void> {
    logger.info('This is an INFO log with some context');

    await dynamodbClient.send(
      new PutItemCommand({
        TableName: process.env.TABLE!,
        Item: {
          id: { S: v4() },
          body: { S: JSON.stringify(_event.detail!) },
        },
      }),
    );

    await eventBusClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source:
              _event.source === 'application.lambda'
                ? 'none'
                : 'application.lambda',
            DetailType:
              _event['detail-type'] === 'transformed'
                ? 'finish'
                : 'transformed',
            Detail: JSON.stringify(_event.detail!),
            EventBusName: process.env.EVENT_BUS_NAME!,
          },
        ],
      }),
    );
  }
}

const myFunction = new Lambda();
export const handler = myFunction.handler.bind(myFunction);
