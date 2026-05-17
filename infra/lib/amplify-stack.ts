import * as cdk from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface AmplifyStackProps extends cdk.StackProps {
    rdsInstance: rds.DatabaseInstance;
}

export class AmplifyStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AmplifyStackProps) {
        super(scope, id, props);

        const { rdsInstance } = props;
        const rdsSecret = rdsInstance.secret!;

        // Amplify SSR 実行用サービスロール
        const serviceRole = new iam.Role(this, 'AmplifyServiceRole', {
            assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
            ],
        });
        rdsSecret.grantRead(serviceRole);

        // アプリ共通シークレット（事前に手動作成が必要）
        // 作成コマンド:
        //   aws secretsmanager create-secret \
        //     --name pawprice/app-secrets \
        //     --region ap-northeast-1 \
        //     --secret-string '{
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

        // DATABASE_URL: RDS エンドポイント + Secrets Manager のパスワードを結合
        const databaseUrl = cdk.Fn.join('', [
            'postgresql://pawprice:',
            rdsSecret.secretValueFromJson('password').unsafeUnwrap(),
            '@',
            rdsInstance.dbInstanceEndpointAddress,
            ':5432/pawprice?sslmode=require',
        ]);

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

        // GitHub PAT の Secrets Manager 格納（事前に手動作成が必要）
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
                DATABASE_URL: databaseUrl,
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

        // master ブランチを本番環境として設定
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
            description: 'Amplify デフォルトドメイン（カスタムドメイン設定前の確認用）',
        });
    }
}
