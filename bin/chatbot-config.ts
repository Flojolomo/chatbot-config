#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ChatbotConfigStack } from '../lib/chatbot-config-stack';
import { OidcProviderStack } from '../lib/oidc-provider-stack';

const app = new cdk.App();

new OidcProviderStack(app, 'OidcProviderStack', {
  env: {
    region: 'eu-central-1',
    account: '767397940951'
  }
});
