import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as eventTargets from 'aws-cdk-lib/aws-events-targets';
import * as cdk from 'aws-cdk-lib';

export class EventBus extends Construct {
  public readonly eventBus: events.IEventBus;

  public constructor(scope: Construct, id: string) {
    super(scope, id);

    const eventBus = new events.EventBus(this, 'event-bus', {});
    this.forwardEventsToLogGroup(eventBus);

    this.eventBus = eventBus;
  }

  private forwardEventsToLogGroup(eventBus: events.EventBus): {
    logGroup: logs.LogGroup;
  } {
    const eventLoggerRule = new events.Rule(this, 'rule', {
      description: 'Log all events',
      eventPattern: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        source: [{ prefix: '' }] as any[],
      },
      eventBus: eventBus,
    });

    const logGroup = new logs.LogGroup(this, 'log-group', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    eventLoggerRule.addTarget(new eventTargets.CloudWatchLogGroup(logGroup));

    return { logGroup };
  }
}
