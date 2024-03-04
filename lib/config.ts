import * as env from 'env-var';

export const config = {
  aws: {
    region: env.get('AWS_REGION').required().asString(),
    account: env.get('AWS_ACCOUNT_ID').required().asString(),
  },
};
