import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ZitadelStack } from '../src/zitadel-stack';

test('Snapshot', () => {
  const app = new App();
  const stack = new ZitadelStack(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});