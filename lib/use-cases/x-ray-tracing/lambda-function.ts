import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';

type LambdaFunctionProps = {
  entry: string;
  environment?: Record<string, string>;
};

export class LambdaFunction extends Construct {
  public readonly handler: lambda.IFunction;

  public get grantPrincipal() {
    return this.handler.grantPrincipal;
  }

  public constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id);

    this.handler = new lambdaNodeJs.NodejsFunction(this, 'lambda', {
      entry: props.entry,
      environment: {
        POWERTOOLS_SERVICE_NAME: 'x-ray-showcase',
        POWERTOOLS_TRACE_ENABLED: String(true),
        POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: String(true),
        POWERTOOLS_TRACER_CAPTURE_RESPONSE: String(true),
        POWERTOOLS_TRACER_CAPTURE_ERROR: String(true),
        POWERTOOLS_LOG_LEVEL: 'DEBUG',
        ...props.environment,
      },
      runtime: lambda.Runtime.NODEJS_20_X,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_DAY,
    });
  }

  public addEventSource(source: lambda.IEventSource) {
    this.handler.addEventSource(source);
  }
}
