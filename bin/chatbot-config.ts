#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OidcProviderStack } from '../lib/oidc-provider-stack';
import { config } from '../lib/config';

const app = new cdk.App();

new OidcProviderStack(app, 'OidcProviderStack', {
  env: {
    region: config.aws.region,
    account: config.aws.account
  }
});
