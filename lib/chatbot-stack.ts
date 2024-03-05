import * as cdk from 'aws-cdk-lib/core';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';

import { Construct } from 'constructs';

interface ChatbotStackProps extends cdk.StackProps {
  slack: {
    channelConfigurationName: string;
    channelId: string;
    workspaceId: string;
  };
}

export class ChatbotStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props: ChatbotStackProps) {
    super(scope, id, props);

    new chatbot.SlackChannelConfiguration(this, 'slack-channel-configuration', {
      slackChannelConfigurationName: props.slack.channelConfigurationName,
      slackChannelId: props.slack.channelId,
      slackWorkspaceId: props.slack.workspaceId,
    });
  }
}
