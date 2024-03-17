#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OidcProviderStack } from '../lib/services/iam/oidc-provider-stack';
import { config } from '../lib/config';
import { ChatbotStack } from '../lib/services/chatbot/chatbot-stack';
import { ConfigStack } from '../lib/services/config/config-stack';
import { XRayTracingStack } from '../lib/use-cases/x-ray-tracing/x-ray-tracing-stack';

const app = new cdk.App();

const env = {
  region: config.aws.region,
  account: config.aws.account,
};

// Service setup & governance
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

// Use cases
new XRayTracingStack(app, 'XRayTracingStack', {
  env,
});
