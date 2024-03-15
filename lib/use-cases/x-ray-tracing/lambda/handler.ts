import { Tracer } from '@aws-lambda-powertools/tracer';
import { LambdaInterface } from '@aws-lambda-powertools/commons/types';

import { Logger } from '@aws-lambda-powertools/logger';
import { EventBridgeEvent } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 } from 'uuid';

const logger = new Logger({});
const tracer = new Tracer({});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dynamodbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

class Lambda implements LambdaInterface {
  // Set the log event flag to true
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
          body: { S: _event.detail! },
        },
      }),
    );
  }
}

const myFunction = new Lambda();
export const handler = myFunction.handler.bind(myFunction);
