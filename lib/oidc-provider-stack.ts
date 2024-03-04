import {
  GithubActionsIdentityProvider,
  GithubActionsRole,
} from 'aws-cdk-github-oidc';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * https://www.npmjs.com/package/aws-cdk-github-oidc
 */
export class OidcProviderStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    		super(scope, id, props);

    const provider = new GithubActionsIdentityProvider(this, 'github-provider');

    const deploymentRole = new GithubActionsRole(this, 'deployment-role', {
      roleName: 'oidc-gha-deployment', // the role name
      provider: provider, // reference into the OIDC provider
      owner: 'Flojolomo', // your repository owner (organization or user) name
      repo: 'chatbot-config', // your repository name (without the owner name)
    });

    new iam.ManagedPolicy(this, 'cdk-deploy-policy', {
      roles: [deploymentRole],
      statements: [
        new iam.PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    new cdk.CfnOutput(this, 'deployment-role-arn', {
      value: deploymentRole.roleArn,
    });
  }
}
