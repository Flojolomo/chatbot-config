import { Tracer } from '@aws-lambda-powertools/tracer';
import { LambdaInterface } from '@aws-lambda-powertools/commons/types';

import { Logger } from '@aws-lambda-powertools/logger';
import {
  BatchProcessor,
  EventType,
  processPartialResponse,
} from '@aws-lambda-powertools/batch';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
// import { PutEventsCommand } from '@aws-sdk/client-cloudwatch-events';

const logger = new Logger({});
const tracer = new Tracer({});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sqsClient = tracer.captureAWSv3Client(new SQSClient({}));

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
    logger.info('Will send body to SQS', { body });

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL!,
        MessageBody: JSON.stringify(body),
      }),
    );
  }
}

const myFunction = new Lambda();
export const handler = myFunction.handler.bind(myFunction);
