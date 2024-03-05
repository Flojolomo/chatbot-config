import * as cdk from 'aws-cdk-lib';
import * as config from 'aws-cdk-lib/aws-config';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

interface ConfigRuleStackProps extends cdk.StackProps {
  cloudformationNotificationTopics: sns.ITopic[];
}

export class ConfigRuleStack extends cdk.Stack {
  public constructor(
    scope: Construct,
    id: string,
    props: ConfigRuleStackProps,
  ) {
    super(scope, id, props);

    new config.CloudFormationStackNotificationCheck(
      this,
      'cloudformation-stack-notification',
      {
        topics: props.cloudformationNotificationTopics,
      },
    );
  }
}
