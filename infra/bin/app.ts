#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack';
import { AmplifyStack } from '../lib/amplify-stack';

const app = new cdk.App();

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-northeast-1', // 東京リージョン
};

const dbStack = new DatabaseStack(app, 'PawPriceDatabaseStack', {
    env,
    description: 'PawPrice VPC + RDS PostgreSQL',
});

new AmplifyStack(app, 'PawPriceAmplifyStack', {
    env,
    rdsInstance: dbStack.rdsInstance,
    description: 'PawPrice Amplify Hosting (Next.js SSR)',
});
