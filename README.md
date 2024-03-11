# Chatbot config

This repository intends to build a chatbot notification system and to enforce that all stacks in the account are sending notifications to the SNS topic that forwards the notifications to slack.

To achieve this, some steps are required:

1. Set up the github action to deploy
   1. Create or load OIDC provider & role to be assumed
   2. Set up the github action
2. Create Chatbot in us-east-1 including the sns topic
3. Set up some stacks to compliant & not compliant and see how it performs

## Ideen

- Semantic versioning based on commit messages
- Config rule to enforce topic on cloudformation stack updates
- Lint for import ordering
- CDK linter
  Questions:

- Can I spin up the chatbot in another region?

## Notes

- Install util tools to improve working with AWS SSO
  - https://github.com/benkehoe/aws-sso-util
- Set up new account to start fresh
- To use multiple SSH keys and different profiles on a per repo basis change `~/.ssh/config` & change remote to `git@A:repository.git`:

```
Host profileA
 HostName github.com
 UseKeychain yes
 IdentityFile ~/.ssh/id_ed25519_A

Host profileB
  HostName github.com
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519_B
```

- Run aws-sso-utils with `aws-sso-util run-as -a <account> -r <profile> aws sts get-caller-identity`
- Bootstrap CDK with `yarn cdk bootstrap --region eu-central-1`. Profile AWSPowerUser is not sufficient, `eu-west-1` did not work.
  `eval "$(ssh-agent -s)"`

- To get this working, the `AWS Chatbot` need to be installed in the slack workspace
- And the client need to be set up via the console
- By default, chatbot uses AdminFullAccess permissions
- `yarn set version stable`
- `aws-sso-util run-as -a XXX -r AWSAdministratorAccess aws configservice describe-remediation-execution-status --config-rule-name ConfigRuleStack-cloudformationstacknotification1104-zcGt8akQpaIZ`
- I get the error `Step fails when it is Execute/Cancelling action. An error occurred (InsufficientCapabilitiesException) when calling the UpdateStack operation: Requires capabilities : [CAPABILITY_IAM]. Please refer to Automation Service Troubleshooting Guide for more diagnosis details.`. This is related to lack of parameter `--capabilities` when calling update stack.

--stack-name "arn:aws:cloudformation:eu-central-1:XXX:stack/ConfigRuleStack/d54790c0-db39-11ee-9d1e-0a982783e419" \
--use-previous-template \
--notification-arns "arn:aws:sns:eu-central-1:XXX:ChatbotStack-chatbottopic9B12A7D0-jQeR3rnjEiYZ" \
--capabilities CAPABILITY_NAMED_IAM | CAPABILITY_IAM
