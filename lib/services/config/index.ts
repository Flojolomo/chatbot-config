import * as cdk from 'aws-cdk-lib';
import * as config from 'aws-cdk-lib/aws-config';
import * as sns from 'aws-cdk-lib/aws-sns';

import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3'; // Import the 's3' module from 'aws-cdk-lib'
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

interface ConfigRuleStackProps extends cdk.StackProps {
  cloudformationNotificationTopics: sns.ITopic[];
  complianceChangeTarget: sns.ITopic;
}

export class ConfigRuleStack extends cdk.Stack {
  public constructor(
    scope: Construct,
    id: string,
    props: ConfigRuleStackProps,
  ) {
    super(scope, id, props);

    this.setUpConfigService();

    this.createConfigRules({
      cloudformationNotificationTopics: props.cloudformationNotificationTopics,
      complianceChangeTarget: props.complianceChangeTarget,
    });
  }

  private createConfigBucket(role: iam.IRole): s3.IBucket {
    const bucket = new s3.Bucket(this, 'config-bucket');
    this.grantReadBucketAclPermission(bucket, role);
    this.grantPutObjectPermission(bucket, role);
    return bucket;
  }

  private grantReadBucketAclPermission(
    bucket: s3.IBucket,
    role: iam.IRole,
  ): void {
    // Attaches the AWSConfigBucketPermissionsCheck policy statement.
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [role],
        resources: [bucket.bucketArn],
        actions: ['s3:GetBucketAcl'],
      }),
    );
  }

  private grantPutObjectPermission(bucket: s3.IBucket, role: iam.IRole): void {
    // Attaches the AWSConfigBucketDelivery policy statement.
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [role],
        resources: [
          bucket.arnForObjects(
            `AWSLogs/${cdk.Stack.of(this).account}/Config/*`,
          ),
        ],
        actions: ['s3:PutObject'],
        conditions: {
          StringEquals: {
            's3:x-amz-acl': 'bucket-owner-full-control',
          },
        },
      }),
    );
  }

  private createRoleForConfigService(): iam.IRole {
    return new iam.Role(this, 'config-role', {
      assumedBy: new iam.ServicePrincipal('config.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWS_ConfigRole',
        ),
      ],
    });
  }

  private createConfigRecorder(
    role: iam.IRole,
  ): config.CfnConfigurationRecorder {
    return new config.CfnConfigurationRecorder(this, 'config-recorder', {
      roleArn: role.roleArn,
      recordingGroup: {
        allSupported: true,
      },
    });
  }

  private createConfigRules({
    cloudformationNotificationTopics,
    // complianceChangeTarget,
  }: {
    cloudformationNotificationTopics: sns.ITopic[];
    complianceChangeTarget: sns.ITopic;
  }): config.IRule[] {
    const { rule: cloudFormationStackNotificationRule } =
      this.createCloudFormationStackNotificationRuleWithRemediation(
        cloudformationNotificationTopics,
      );

    return [cloudFormationStackNotificationRule];
  }

  // eslint-disable-next-line max-lines-per-function
  private createCloudFormationStackNotificationRuleWithRemediation(
    cloudformationNotificationTopics: sns.ITopic[],
  ): {
    rule: config.CloudFormationStackNotificationCheck;
    remediation: config.CfnRemediationConfiguration;
  } {
    const rule = new config.CloudFormationStackNotificationCheck(
      this,
      'cloudformation-stack-notification',
      {
        topics: cloudformationNotificationTopics,
      },
    );

    const documentContent = fs.readFileSync(
      path.join(
        __dirname,
        'ssm-documents',
        'EnableCloudFormationStackSNSNotification-WithIam.yaml',
      ),
      'utf8',
    );

    new ssm.CfnDocument(
      this,
      'cloudformation-stack-notification-remediation-document-with-iam',
      {
        name: 'EnableCloudFormationStackSNSNotification-WithIam',
        content: yaml.load(documentContent),
        documentFormat: 'YAML',
        documentType: 'Automation',
      },
    );

    const remediationRole = new iam.Role(
      this,
      'cloudformation-stack-notification-remediation-role',
      {
        assumedBy: new iam.ServicePrincipal('ssm.amazonaws.com'),
        inlinePolicies: {
          setSnsTopicPolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                sid: 'CDKToolkitUpdatePermissions',
                actions: [
                  'iam:GetRole',
                  'ssm:GetParameters',
                  'kms:CreateKey',
                  'kms:DescribeKey',
                ],
                resources: ['*'],
              }),
              new iam.PolicyStatement({
                sid: 'SnsPermissions',
                actions: ['sns:Publish'],
                resources: cloudformationNotificationTopics.map(
                  (topic) => topic.topicArn,
                ),
              }),
              new iam.PolicyStatement({
                sid: 'CloudFormationPermissions',
                actions: [
                  'cloudformation:DescribeStacks',
                  'cloudformation:UpdateStack',
                ],
                resources: ['*'],
              }),
            ],
          }),
        },
      },
    );

    const remediation = new config.CfnRemediationConfiguration(
      this,
      'cloudformation-stack-notification-remediation',
      {
        configRuleName: rule.configRuleName,
        targetId: 'EnableCloudFormationStackSNSNotification-WithIam',
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

    return { rule: rule, remediation };
  }

  private createDeliveryChannel(bucket: s3.IBucket): {
    deliveryChannel: config.CfnDeliveryChannel;
  } {
    const deliveryChannel = new config.CfnDeliveryChannel(
      this,
      'config-delivery-channel',
      {
        s3BucketName: bucket.bucketName,
      },
    );

    return { deliveryChannel };
  }

  private setUpConfigService(): void {
    const role = this.createRoleForConfigService();
    const configBucket = this.createConfigBucket(role);
    this.createConfigRecorder(role);
    this.createDeliveryChannel(configBucket);
  }
}
