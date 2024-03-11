import * as cdk from 'aws-cdk-lib/core';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';

import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';

interface ChatbotStackProps extends cdk.StackProps {
  slack: {
    channelConfigurationName: string;
    channelId: string;
    workspaceId: string;
  };
}

export class ChatbotStack extends cdk.Stack {
  public readonly notificationTopic: sns.Topic;

  public constructor(scope: Construct, id: string, props: ChatbotStackProps) {
    super(scope, id, props);

    const chatbotTopic = new sns.Topic(this, 'chatbot-topic');

    new chatbot.SlackChannelConfiguration(this, 'slack-channel-configuration', {
      slackChannelConfigurationName: props.slack.channelConfigurationName,
      slackChannelId: props.slack.channelId,
      slackWorkspaceId: props.slack.workspaceId,
      notificationTopics: [chatbotTopic],
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });

    this.notificationTopic = chatbotTopic;
  }
}
