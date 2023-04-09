import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class ZitadelStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    /** The VPC that will be used for app and database. */
    const vpc = new ec2.Vpc(this, 'VPC', { natGateways: 1 });

    /** The PostgreSQL cluster */
    const db = new rds.DatabaseCluster(this, 'DatabaseCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_6,
      }),
      instanceProps: {
        instanceType: new ec2.InstanceType('r6g.large'),
        enablePerformanceInsights: true,
        vpc,
      },
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      defaultDatabaseName: 'postgres',
    });

    /** The ECS cluster */
    const cluster = new ecs.Cluster(this, 'Cluster', {
      enableFargateCapacityProviders: true,
      containerInsights: true,
      vpc,
    });

    /** The ECS Service */
    const service = new ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      cpu: 1024,
      memoryLimitMiB: 2048,
      taskImageOptions: {
        containerName: 'zitadel',
        image: ecs.ContainerImage.fromRegistry('ghcr.io/zitadel/zitadel:latest'),
        containerPort: 8080,
        command: [
          'start-from-init',
          '--masterkey', 'MasterkeyNeedsToHave32Characters',
          '--tlsMode', 'disabled',
        ],
        environment: {
          ZITADEL_EXTERNALSECURE: 'false',
          ZITADEL_DATABASE_POSTGRES_HOST: db.clusterEndpoint.hostname,
          ZITADEL_DATABASE_POSTGRES_PORT: db.clusterEndpoint.port.toString(),
          ZITADEL_DATABASE_POSTGRES_USER_SSL_MODE: 'disable',
          ZITADEL_DATABASE_POSTGRES_ADMIN_SSL_MODE: 'disable',
        },
        secrets: {
          ZITADEL_DATABASE_POSTGRES_DATABASE: ecs.Secret.fromSecretsManager(db.secret!, 'dbname'),
          ZITADEL_DATABASE_POSTGRES_USER_USERNAME: ecs.Secret.fromSecretsManager(db.secret!, 'username'),
          ZITADEL_DATABASE_POSTGRES_USER_PASSWORD: ecs.Secret.fromSecretsManager(db.secret!, 'password'),
          ZITADEL_DATABASE_POSTGRES_ADMIN_USERNAME: ecs.Secret.fromSecretsManager(db.secret!, 'username'),
          ZITADEL_DATABASE_POSTGRES_ADMIN_PASSWORD: ecs.Secret.fromSecretsManager(db.secret!, 'password'),
        },
      },
    });

    // Health Check - https://zitadel.com/docs/apis/observability/health#healthy
    service.targetGroup.configureHealthCheck({
      path: '/debug/healthz',
    });

    // Allow access from Zitadel App
    db.connections.allowDefaultPortFrom(service.service, 'from Zitadel App');

  }
}
