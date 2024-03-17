import { LambdaInterface } from '@aws-lambda-powertools/commons/types';

import { Logger } from '@aws-lambda-powertools/logger';
import {
  BatchProcessor,
  EventType,
  processPartialResponse,
} from '@aws-lambda-powertools/batch';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SNSClient } from '@aws-sdk/client-sns';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { PublishCommand } from '@aws-sdk/client-sns';

const logger = new Logger({});
const tracer = new Tracer({});
const snsClient = tracer.captureAWSv3Client(new SNSClient({}));
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
    const body = JSON.parse(record.body!);
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.TOPIC_ARN!,
        Message: body,
        MessageStructure: 'json',
      }),
    );
  }
}

const myFunction = new Lambda();
export const handler = myFunction.handler.bind(myFunction);
