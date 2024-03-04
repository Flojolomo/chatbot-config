# Chatbot config

This repository intends to build a chatbot notification system and to enforce that all stacks in the account are sending notifications to the SNS topic that forwards the notifications to slack.

To achieve this, some steps are required:

1. Set up the github action to deploy
   1. Create or load OIDC provider & role to be assumed
   2. Set up the github action
2. Create Chatbot in us-east-1 including the sns topic

Questions:

- Can I spin up the chatbot in another region?

## Notes

- Install util tools to improve working with AWS SSO
  - https://github.com/benkehoe/aws-sso-util (pipx & )
