import { Construct } from 'constructs';
import * as config from 'aws-cdk-lib/aws-config';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';

interface CloudFormationStackNotificationProps {
  cloudformationStackNotificationTopics: sns.ITopic[];
}

export class CloudFormationStackNotification extends Construct {
  public readonly rule: config.CloudFormationStackNotificationCheck;
  public constructor(
    scope: Construct,
    id: string,
    props: CloudFormationStackNotificationProps,
  ) {
    super(scope, id);

    const rule = this.createConfigRule({
      cloudformationNotificationTopics:
        props.cloudformationStackNotificationTopics,
    });

    const documentName = 'EnableCloudFormationStackSNSNotification-WithIam';
    this.createSsmRemediationDocument({
      documentName,
      documentExtension: 'yaml',
    });

    const remediationRole = this.createRoleForRemediation();
    this.createRemediationConfiguration({
      cloudformationNotificationTopics:
        props.cloudformationStackNotificationTopics,
      documentName,
      remediationRole,
      rule,
    });

    this.rule = rule;
  }

  private createConfigRule({
    cloudformationNotificationTopics,
  }: {
    cloudformationNotificationTopics: sns.ITopic[];
  }): config.CloudFormationStackNotificationCheck {
    return new config.CloudFormationStackNotificationCheck(this, 'rule', {
      topics: cloudformationNotificationTopics,
    });
  }

  // eslint-disable-next-line max-lines-per-function
  private createRemediationConfiguration({
    cloudformationNotificationTopics,
    documentName,
    remediationRole,
    rule,
  }: {
    cloudformationNotificationTopics: sns.ITopic[];
    documentName: string;
    remediationRole: iam.IRole;
    rule: config.CloudFormationStackNotificationCheck;
  }): config.CfnRemediationConfiguration {
    return new config.CfnRemediationConfiguration(
      this,
      'cloudformation-stack-notification-remediation',
      {
        configRuleName: rule.configRuleName,
        targetId: documentName,
        targetType: 'SSM_DOCUMENT',
        automatic: true,
        maximumAutomaticAttempts: 5,
        retryAttemptSeconds: 60,
        parameters: {
          AutomationAssumeRole: {
            StaticValue: {
              Values: [remediationRole.roleArn],
            },
          },
          StackName: {
            ResourceValue: {
              Value: 'RESOURCE_ID',
            },
          },
          NotificationArn: {
            StaticValue: {
              Values: cloudformationNotificationTopics.map(
                (topic) => topic.topicArn,
              ),
            },
          },
        },
      },
    );
  }
  private createRoleForRemediation(): iam.IRole {
    return new iam.Role(this, 'remediation-role', {
      assumedBy: new iam.ServicePrincipal('ssm.amazonaws.com'),
      inlinePolicies: {
        updateCdkToolkitStack: this.generatePolicyToUpdateCdkToolkitStack(),
        updateStacks: this.generatePolicyToUpdateStacks(),
        // updateStacks:
        // setSnsTopicPolicy: new iam.PolicyDocument({
        //   statements: [
        //     new iam.PolicyStatement({
        //       sid: 'SnsPermissions',
        //       actions: ['sns:Publish'],
        //       resources: cloudformationNotificationTopics.map(
        //         (topic) => topic.topicArn,
        //       ),
        //     }),
        //     new iam.PolicyStatement({
        //       sid: 'CloudFormationPermissions',
        //       actions: [
        //         'cloudformation:DescribeStacks',
        //         'cloudformation:UpdateStack',
        //       ],
        //       resources: ['*'],
        //     }),
        //   ],
        // }),
      },
    });
  }

  private createSsmRemediationDocument({
    documentName,
    documentExtension,
  }: {
    documentName: string;
    documentExtension: string;
  }): void {
    const documentContent = fs.readFileSync(
      path.join(
        __dirname,
        'ssm-documents',
        `${documentName}.${documentExtension}`,
      ),
      'utf8',
    );

    new ssm.CfnDocument(
      this,
      'cloudformation-stack-notification-remediation-document-with-iam',
      {
        name: documentName,
        content: yaml.load(documentContent),
        documentType: 'Automation',
        documentFormat: 'YAML',
      },
    );
  }

  private generatePolicyToUpdateCdkToolkitStack(): iam.PolicyDocument {
    return new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          sid: 'UpdateCdkToolkitStack',
          actions: [
            'iam:GetRole',
            'ssm:GetParameters',
            'kms:CreateKey',
            'kms:DescribeKey',
            'cloudformation:DescribeStacks',
            'cloudformation:UpdateStack',
          ],
          resources: ['*'],
        }),
      ],
    });
  }

  private generatePolicyToUpdateStacks(): iam.PolicyDocument {
    return new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          sid: 'UpdateStacks',
          actions: [
            'cloudformation:DescribeStacks',
            'cloudformation:UpdateStack',
          ],
          resources: ['*'],
        }),
      ],
    });
  }
}
