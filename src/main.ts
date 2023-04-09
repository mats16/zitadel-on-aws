import { App } from 'aws-cdk-lib';
import { ZitadelStack } from './zitadel-stack';

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new ZitadelStack(app, 'Zitadel', { env: devEnv });
// new MyStack(app, 'zitadel-on-aws-prod', { env: prodEnv });

app.synth();