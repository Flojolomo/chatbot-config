import { Tracer } from '@aws-lambda-powertools/tracer';
import { LambdaInterface } from '@aws-lambda-powertools/commons/types';

import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({});
const tracer = new Tracer({});

class Lambda implements LambdaInterface {
  // Set the log event flag to true
  @tracer.captureLambdaHandler()
  @logger.injectLambdaContext({ logEvent: true })
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  public async handler(_event: unknown, _context: unknown): Promise<void> {
    logger.info('This is an INFO log with some context');
  }
}

const myFunction = new Lambda();
export const handler = myFunction.handler.bind(myFunction);
