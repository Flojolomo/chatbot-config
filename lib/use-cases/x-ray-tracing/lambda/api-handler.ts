import { Tracer } from '@aws-lambda-powertools/tracer';
import { LambdaInterface } from '@aws-lambda-powertools/commons/types';

import { Logger } from '@aws-lambda-powertools/logger';
import { APIGatewayEvent, ProxyResult } from 'aws-lambda';
// import { PutEventsCommand } from '@aws-sdk/client-cloudwatch-events';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

const logger = new Logger({});
const tracer = new Tracer({});

const eventBusClient = tracer.captureAWSv3Client(new EventBridgeClient({}));

class Lambda implements LambdaInterface {
  // Set the log event flag to true
  // eslint-disable-next-line max-lines-per-function
  @tracer.captureLambdaHandler()
  @logger.injectLambdaContext({ logEvent: true })
  public async handler(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _event: APIGatewayEvent,
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    _context: unknown,
  ): Promise<ProxyResult> {
    logger.info('This is an INFO log with some context');

    const response = await eventBusClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'api.rest.public',
            DetailType: 'lambda-procesed',
            Detail: JSON.stringify(JSON.parse(_event.body!)),
            EventBusName: process.env.EVENT_BUS_NAME!,
          },
        ],
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ response }),
    };
  }
}

const myFunction = new Lambda();
export const handler = myFunction.handler.bind(myFunction);