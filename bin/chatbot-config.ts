#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OidcProviderStack } from '../lib/services/iam/oidc-provider-stack';
import { config } from '../lib/config';
import { ChatbotStack } from '../lib/services/chatbot/chatbot-stack';
import { ConfigStack } from '../lib/services/config/config-stack';
import { DatadogDeploymentRoleStack } from '../lib/services/iam/datadog-deployment-role';

const app = new cdk.App();

const env = {
  region: config.aws.region,
  account: config.aws.account,
};

new OidcProviderStack(app, 'OidcProviderStack', {
  env,
});

const { notificationTopic } = new ChatbotStack(app, 'ChatbotStack', {
  env,
  slack: config.chatbot.slack,
});

new ConfigStack(app, 'ConfigRuleStack', {
  env,
  cloudformationStackNotificationTopics: [notificationTopic],
  complianceChangeTarget: notificationTopic,
});

new DatadogDeploymentRoleStack(app, 'DatadogDeploymentRoleStack', {
  env,
});
