import * as cdk from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class AmplifyStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Amplify SSR 実行用サービスロール
        const serviceRole = new iam.Role(this, 'AmplifyServiceRole', {
            assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
            ],
        });

        // アプリシークレット（デプロイ前に手動で1回作成が必要）
        // 作成コマンド:
        //   aws secretsmanager create-secret \
        //     --name pawprice/app-secrets \
        //     --region ap-northeast-1 \
        //     --secret-string '{
        //       "DATABASE_URL": "postgresql://...(Neon接続文字列)...",
        //       "YAHOO_APP_ID": "...",
        //       "NEXT_PUBLIC_VAPID_PUBLIC_KEY": "...",
        //       "VAPID_PRIVATE_KEY": "...",
        //       "VAPID_SUBJECT": "mailto:your@email.com",
        //       "NEXT_PUBLIC_APP_URL": "https://your-domain.com"
        //     }'
        const appSecrets = secretsmanager.Secret.fromSecretNameV2(
            this,
            'AppSecrets',
            'pawprice/app-secrets',
        );
        appSecrets.grantRead(serviceRole);

        // Next.js モノレポ用ビルドスペック（frontend/ をアプリルートに指定）
        const buildSpec = codebuild.BuildSpec.fromObject({
            version: '1',
            applications: [
                {
                    appRoot: 'frontend',
                    frontend: {
                        phases: {
                            preBuild: {
                                commands: ['npm ci'],
                            },
                            build: {
                                commands: [
                                    'npx prisma generate',
                                    'npm run build',
                                ],
                            },
                        },
                        artifacts: {
                            baseDirectory: '.next',
                            files: ['**/*'],
                        },
                        cache: {
                            paths: ['node_modules/**/*', '.next/cache/**/*'],
                        },
                    },
                },
            ],
        });

        // GitHub PAT（Secrets Manager に事前登録が必要）
        // 作成コマンド:
        //   aws secretsmanager create-secret \
        //     --name pawprice/github-token \
        //     --region ap-northeast-1 \
        //     --secret-string "ghp_xxxxxxxxxxxxxxxxxxxx"
        const amplifyApp = new amplify.App(this, 'PawPriceApp', {
            appName: 'PawPrice',
            role: serviceRole,
            sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
                owner: 'GondaNobuhiro',
                repository: 'PawPrice',
                oauthToken: cdk.SecretValue.secretsManager('pawprice/github-token'),
            }),
            buildSpec,
            environmentVariables: {
                DATABASE_URL: appSecrets.secretValueFromJson('DATABASE_URL').unsafeUnwrap(),
                YAHOO_APP_ID: appSecrets.secretValueFromJson('YAHOO_APP_ID').unsafeUnwrap(),
                NEXT_PUBLIC_VAPID_PUBLIC_KEY: appSecrets.secretValueFromJson('NEXT_PUBLIC_VAPID_PUBLIC_KEY').unsafeUnwrap(),
                VAPID_PRIVATE_KEY: appSecrets.secretValueFromJson('VAPID_PRIVATE_KEY').unsafeUnwrap(),
                VAPID_SUBJECT: appSecrets.secretValueFromJson('VAPID_SUBJECT').unsafeUnwrap(),
                NEXT_PUBLIC_APP_URL: appSecrets.secretValueFromJson('NEXT_PUBLIC_APP_URL').unsafeUnwrap(),
            },
        });

        // Next.js SSR モードを明示的に有効化
        const cfnApp = amplifyApp.node.defaultChild as amplify.CfnApp;
        cfnApp.platform = 'WEB_COMPUTE';

        amplifyApp.addBranch('master', {
            branchName: 'master',
            autoBuild: true,
            stage: 'PRODUCTION',
        });

        new cdk.CfnOutput(this, 'AmplifyAppId', {
            value: amplifyApp.appId,
            description: 'Amplify App ID',
        });
        new cdk.CfnOutput(this, 'AmplifyDefaultDomain', {
            value: `https://master.${amplifyApp.defaultDomain}`,
            description: 'Amplify デフォルトドメイン',
        });
    }
}
