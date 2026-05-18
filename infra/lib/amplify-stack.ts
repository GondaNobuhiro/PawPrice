import * as cdk from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as amplifyL1 from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class AmplifyStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const serviceRole = new iam.Role(this, 'AmplifyServiceRole', {
            assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
            ],
        });

        // シークレット2つのみ管理
        //
        // [1] pawprice/github-token
        //   GitHub PAT（repo スコープ）
        //   作成: aws secretsmanager create-secret \
        //           --name pawprice/github-token \
        //           --region ap-northeast-1 \
        //           --secret-string "ghp_xxxxxxxxxxxxxxxxxxxx"
        //
        // [2] pawprice/app-secrets
        //   {
        //     "DATABASE_URL":               "postgresql://...(Neon接続文字列)...",
        //     "VAPID_PRIVATE_KEY":          "...",
        //     "NEXT_PUBLIC_VAPID_PUBLIC_KEY":"...",
        //     "VAPID_SUBJECT":              "mailto:your@email.com",
        //     "NEXT_PUBLIC_APP_URL":        "https://master.xxxxxxxx.amplifyapp.com"
        //   }
        //   作成: aws secretsmanager create-secret \
        //           --name pawprice/app-secrets \
        //           --region ap-northeast-1 \
        //           --secret-string '{"DATABASE_URL":"...","VAPID_PRIVATE_KEY":"...",...}'
        const appSecrets = secretsmanager.Secret.fromSecretNameV2(
            this,
            'AppSecrets',
            'pawprice/app-secrets',
        );
        appSecrets.grantRead(serviceRole);

        const amplifyApp = new amplify.App(this, 'PawPriceApp', {
            appName: 'PawPrice',
            role: serviceRole,
            sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
                owner: 'GondaNobuhiro',
                repository: 'PawPrice',
                oauthToken: cdk.SecretValue.secretsManager('pawprice/github-token'),
            }),
            environmentVariables: {
                DATABASE_URL:                appSecrets.secretValueFromJson('DATABASE_URL').unsafeUnwrap(),
                VAPID_PRIVATE_KEY:           appSecrets.secretValueFromJson('VAPID_PRIVATE_KEY').unsafeUnwrap(),
                NEXT_PUBLIC_VAPID_PUBLIC_KEY: appSecrets.secretValueFromJson('NEXT_PUBLIC_VAPID_PUBLIC_KEY').unsafeUnwrap(),
                VAPID_SUBJECT:               appSecrets.secretValueFromJson('VAPID_SUBJECT').unsafeUnwrap(),
                NEXT_PUBLIC_APP_URL:         appSecrets.secretValueFromJson('NEXT_PUBLIC_APP_URL').unsafeUnwrap(),
            },
        });

        // Next.js SSR モードを有効化（Compute ベース）
        (amplifyApp.node.defaultChild as amplifyL1.CfnApp).platform = 'WEB_COMPUTE';

        // master ブランチへの push で自動デプロイ
        // WEB_COMPUTE Lambda はブランチレベルの環境変数を参照するためアプリレベルと同じ値を設定
        amplifyApp.addBranch('master', {
            branchName: 'master',
            autoBuild: true,
            stage: 'PRODUCTION',
            environmentVariables: {
                DATABASE_URL:                appSecrets.secretValueFromJson('DATABASE_URL').unsafeUnwrap(),
                VAPID_PRIVATE_KEY:           appSecrets.secretValueFromJson('VAPID_PRIVATE_KEY').unsafeUnwrap(),
                NEXT_PUBLIC_VAPID_PUBLIC_KEY: appSecrets.secretValueFromJson('NEXT_PUBLIC_VAPID_PUBLIC_KEY').unsafeUnwrap(),
                VAPID_SUBJECT:               appSecrets.secretValueFromJson('VAPID_SUBJECT').unsafeUnwrap(),
                NEXT_PUBLIC_APP_URL:         appSecrets.secretValueFromJson('NEXT_PUBLIC_APP_URL').unsafeUnwrap(),
            },
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
