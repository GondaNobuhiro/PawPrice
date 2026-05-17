import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
    public readonly rdsInstance: rds.DatabaseInstance;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // VPC: NAT Gateway なし（コスト削減）
        // Amplify・GitHub Actions どちらもパブリックから接続するため
        // RDS はパブリックサブネットに配置し、SSL を強制する
        const vpc = new ec2.Vpc(this, 'Vpc', {
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
            ],
        });

        const dbSg = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
            vpc,
            description: 'PawPrice RDS PostgreSQL',
        });
        // ポート 5432 を開放（SSL 強制により暗号化通信のみ許可）
        dbSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432));

        // SSL 接続を強制するパラメータグループ
        const parameterGroup = new rds.ParameterGroup(this, 'DbParameterGroup', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16,
            }),
            parameters: { 'rds.force_ssl': '1' },
        });

        this.rdsInstance = new rds.DatabaseInstance(this, 'RdsInstance', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            securityGroups: [dbSg],
            // パスワードは Secrets Manager に自動生成・保存
            credentials: rds.Credentials.fromGeneratedSecret('pawprice', {
                secretName: 'pawprice/rds-credentials',
            }),
            databaseName: 'pawprice',
            instanceIdentifier: 'pawprice-db',
            allocatedStorage: 20,
            storageType: rds.StorageType.GP3,
            multiAz: false,
            publiclyAccessible: true,
            storageEncrypted: true,
            deletionProtection: true,
            parameterGroup,
            backupRetention: cdk.Duration.days(7),
            autoMinorVersionUpgrade: true,
        });

        new cdk.CfnOutput(this, 'DbEndpoint', {
            value: this.rdsInstance.dbInstanceEndpointAddress,
            description: 'RDS エンドポイント',
            exportName: 'PawPriceDbEndpoint',
        });
        new cdk.CfnOutput(this, 'DbSecretArn', {
            value: this.rdsInstance.secret!.secretArn,
            description: 'Secrets Manager ARN（パスワード確認用）',
            exportName: 'PawPriceDbSecretArn',
        });
    }
}
