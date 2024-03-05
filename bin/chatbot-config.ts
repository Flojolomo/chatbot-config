#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OidcProviderStack } from '../lib/oidc-provider-stack';
import { config } from '../lib/config';
import { ChatbotStack } from '../lib/chatbot-stack';
import { ConfigRuleStack } from '../lib/config-rules-stack';

const app = new cdk.App();

new OidcProviderStack(app, 'OidcProviderStack', {
  env: {
    region: config.aws.region,
    account: config.aws.account,
  },
});

const { notificationTopic } = new ChatbotStack(app, 'ChatbotStack', {
  env: {
    region: config.aws.region,
    account: config.aws.account,
  },
  slack: config.chatbot.slack,
});

new ConfigRuleStack(app, 'ConfigRuleStack', {
  cloudformationNotificationTopics: [notificationTopic],
});
