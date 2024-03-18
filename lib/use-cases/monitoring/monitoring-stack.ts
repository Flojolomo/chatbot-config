import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatadogIntegration } from 'cdk-datadog-integration';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';

type MonitoringStackProps = cdk.StackProps & {
  externalId: string;
  site: string;
};
export class MonitoringStack extends cdk.Stack {
  public constructor(
    scope: Construct,
    id: string,
    props: MonitoringStackProps,
  ) {
    super(scope, id, props);

    new DatadogIntegration(this, 'Datadog', {
      // Generate an ID here: https://app.datadoghq.com/account/settings#integrations/amazon-web-services
      ...props,
      // Create or lookup a `Secret` that contains your Datadog API Key
      // See https://docs.aws.amazon.com/cdk/api/latest/docs/aws-secretsmanager-readme.html for details on Secrets in CDK
      // Get your API key here: https://app.datadoghq.com/account/settings#api
      apiKey: secrets.Secret.fromSecretNameV2(
        this,
        'datadog-api-key',
        'DatadogApiKey',
      ),
    });
  }
}
