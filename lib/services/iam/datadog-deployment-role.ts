import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class DatadogDeploymentRoleStack extends cdk.Stack {
  // eslint-disable-next-line max-lines-per-function
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a new IAM role to be assumed by CloudFormation to roll out datadog stacks
    const datadogDeploymentRole = new iam.Role(
      this,
      'datadog-deployment-role',
      {
        assumedBy: new iam.ServicePrincipal('cloudformation.amazonaws.com'),
      },
    );

    new iam.ManagedPolicy(this, 'datadog-deployment-policy', {
      roles: [datadogDeploymentRole],
      statements: [
        new iam.PolicyStatement({
          actions: [
            'apigateway:GET',
            'autoscaling:Describe*',
            'backup:List*',
            'budgets:ViewBudget',
            'cloudfront:GetDistributionConfig',
            'cloudfront:ListDistributions',
            'cloudtrail:DescribeTrails',
            'cloudtrail:GetTrailStatus',
            'cloudtrail:LookupEvents',
            'cloudwatch:Describe*',
            'cloudwatch:Get*',
            'cloudwatch:List*',
            'codedeploy:List*',
            'codedeploy:BatchGet*',
            'directconnect:Describe*',
            'dynamodb:List*',
            'dynamodb:Describe*',
            'ec2:Describe*',
            'ec2:GetTransitGatewayPrefixListReferences',
            'ec2:SearchTransitGatewayRoutes',
            'ecs:Describe*',
            'ecs:List*',
            'elasticache:Describe*',
            'elasticache:List*',
            'elasticfilesystem:DescribeFileSystems',
            'elasticfilesystem:DescribeTags',
            'elasticfilesystem:DescribeAccessPoints',
            'elasticloadbalancing:Describe*',
            'elasticmapreduce:List*',
            'elasticmapreduce:Describe*',
            'es:ListTags',
            'es:ListDomainNames',
            'es:DescribeElasticsearchDomains',
            'events:CreateEventBus',
            'fsx:DescribeFileSystems',
            'fsx:ListTagsForResource',
            'health:DescribeEvents',
            'health:DescribeEventDetails',
            'health:DescribeAffectedEntities',
            'kinesis:List*',
            'kinesis:Describe*',
            'lambda:GetPolicy',
            'lambda:List*',
            'logs:DeleteSubscriptionFilter',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
            'logs:DescribeSubscriptionFilters',
            'logs:FilterLogEvents',
            'logs:PutSubscriptionFilter',
            'logs:TestMetricFilter',
            'organizations:Describe*',
            'organizations:List*',
            'rds:Describe*',
            'rds:List*',
            'redshift:DescribeClusters',
            'redshift:DescribeLoggingStatus',
            'route53:List*',
            's3:GetBucketLogging',
            's3:GetBucketLocation',
            's3:GetBucketNotification',
            's3:GetBucketTagging',
            's3:ListAllMyBuckets',
            's3:PutBucketNotification',
            'ses:Get*',
            'sns:List*',
            'sns:Publish',
            'sqs:ListQueues',
            'states:ListStateMachines',
            'states:DescribeStateMachine',
            'support:DescribeTrustedAdvisor*',
            'support:RefreshTrustedAdvisorCheck',
            'tag:GetResources',
            'tag:GetTagKeys',
            'tag:GetTagValues',
            'xray:BatchGetTraces',
            'xray:GetTraceSummaries',
          ],
          effect: iam.Effect.ALLOW,
          resources: ['*'],
        }),
      ],
    });

    new cdk.CfnOutput(this, 'datadog-deployment-role-arn', {
      value: datadogDeploymentRole.roleArn,
      description:
        'Role to be assumed by CloudFormation to deploy datadog integrations',
    });
  }
}
