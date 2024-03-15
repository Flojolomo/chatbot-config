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
import { v4 } from 'uuid';

const logger = new Logger({});
const tracer = new Tracer({});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dynamodbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

const processor = new BatchProcessor(EventType.SQS);

class Lambda implements LambdaInterface {
  // Set the log event flag to true
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

  private async recordHandler(record: SQSRecord) {
    logger.info('Processing event', { record });

    await dynamodbClient.send(
      new PutItemCommand({
        TableName: process.env.TABLE!,
        Item: {
          id: { S: v4() },
          body: { S: record.body! },
        },
      }),
    );
  }
}

const myFunction = new Lambda();
export const handler = myFunction.handler.bind(myFunction);
