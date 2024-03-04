import {
  GithubActionsIdentityProvider,
  GithubActionsRole
} from 'aws-cdk-github-oidc';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class OidcProviderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const provider = new GithubActionsIdentityProvider(this, 'github-provider');

    const deploymentRole = new GithubActionsRole(this, 'deployment-role', {
      roleName: 'oidc-gha-deployment', // the role name
      provider: provider, // reference into the OIDC provider
      owner: 'Flojolomo', // your repository owner (organization or user) name
      repo: 'chatbot-config' // your repository name (without the owner name)
    });

    new cdk.CfnOutput(this, 'deployment-role-arn', {
      value: deploymentRole.roleArn
    });
  }
}
