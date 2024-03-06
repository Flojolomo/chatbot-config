import * as cdk from 'aws-cdk-lib';
import * as config from 'aws-cdk-lib/aws-config';
import * as sns from 'aws-cdk-lib/aws-sns';

import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3'; // Import the 's3' module from 'aws-cdk-lib'

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

    this.setUpConfigService();

    new config.CloudFormationStackNotificationCheck(
      this,
      'cloudformation-stack-notification',
      {
        topics: props.cloudformationNotificationTopics,
      },
    );
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
          'service-role/AWSConfigRole',
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

  private setUpConfigService(): void {
    const role = this.createRoleForConfigService();
    // const configRecorder = this.createConfigRecorder(role);
    // const configBucket = this.createConfigBucket(role);

    this.createConfigBucket(role);

    // const deliveryChannel = new config.CfnDeliveryChannel(
    //   this,
    //   'config=delivery-channel',
    //   {
    //     s3BucketName: configBucket.bucketName,
    //   },
    // );
    // configRecorder.addDependency(deliveryChannel);
  }
}
