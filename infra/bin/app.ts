#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AmplifyStack } from '../lib/amplify-stack';

const app = new cdk.App();

new AmplifyStack(app, 'PawPriceAmplifyStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'ap-northeast-1', // 東京リージョン
    },
    description: 'PawPrice Amplify Hosting (Next.js SSR)',
});
