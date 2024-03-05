import * as env from 'env-var';

export const config = {
  aws: {
    region: env.get('AWS_REGION').required().asString(),
    account: env.get('AWS_ACCOUNT_ID').required().asString(),
  },
  chatbot: {
    slack: {
      channelConfigurationName: env
        .get('SLACK_CHANNEL_CONFIGURATION_NAME')
        .required()
        .asString(),
      channelId: env.get('SLACK_CHANNEL_ID').required().asString(),
      workspaceId: env.get('SLACK_WORKSPACE_ID').required().asString(),
    },
  },
};
