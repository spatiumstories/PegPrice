import { IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { App, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export class PegPrice extends Stack {
  constructor(app: App, id: string) {
    super(app, id);

    const dynamoTable = new Table(this, 'PricePeggedBooks', {
      partitionKey: {
        name: 'postHashHex',
        type: AttributeType.STRING
      },
      readCapacity: 1,
      writeCapacity: 1,
      tableName: 'PricePeggedBooks',

      /**
       *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new table, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will delete the table (even if it has data in it)
       */
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      depsLockFilePath: join(__dirname, 'lambdas', 'package-lock.json'),
      environment: {
        PRIMARY_KEY: 'postHashHex',
        TABLE_NAME: dynamoTable.tableName,
        PRICE_COL: 'price'
      },
      runtime: Runtime.NODEJS_14_X,
    }

    // Create a Lambda function for each of the CRUD operations
    // Lambdas needed:
    // 1. Add RARE book
    // 2. Scheduled Lambda that takes all RARE books, checks Deso for current ownership, pays author, and deletes item
    const addBookPrice = new NodejsFunction(this, 'addBookPrice', {
      entry: join(__dirname, 'lambdas', 'add-book-price.ts'),
      ...nodeJsFunctionProps,
    });
    const checkBookPrices = new NodejsFunction(this, 'checkBookPrices', {
      entry: join(__dirname, 'lambdas', 'check-book-prices.js'),
      ...nodeJsFunctionProps,
    });
    const deleteBookPrice = new NodejsFunction(this, 'deleteBookPrice', {
      entry: join(__dirname, 'lambdas', 'delete-book-price.ts'),
      ...nodeJsFunctionProps,
    });
    const updateBookPrice = new NodejsFunction(this, 'updateBookPrice', {
      entry: join(__dirname, 'lambdas', 'update-book-price.ts'),
      ...nodeJsFunctionProps,
    });


    // Grant the Lambda function read access to the DynamoDB table
    dynamoTable.grantReadWriteData(addBookPrice);
    dynamoTable.grantReadWriteData(checkBookPrices);
    dynamoTable.grantReadWriteData(deleteBookPrice);
    dynamoTable.grantReadWriteData(updateBookPrice);

    // Create schedule for checkRareBooks lambda
    const eventRule = new Rule(this, 'scheduleRule', {
      schedule: Schedule.expression('rate(6 hours)'),
    });
    eventRule.addTarget(new LambdaFunction(checkBookPrices));

    // Integrate the Lambda functions with the API Gateway resource
    const addBookPriceIntegration = new LambdaIntegration(addBookPrice);
    const deleteBookPriceIntegration = new LambdaIntegration(deleteBookPrice);
    const updateBookPriceIntegration = new LambdaIntegration(updateBookPrice);


    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, 'pegPriceAPI', {
      restApiName: 'Peg Price API'
    });

    const books = api.root.addResource('api');
    books.addMethod('POST', addBookPriceIntegration);
    books.addMethod('DELETE', deleteBookPriceIntegration);
    books.addMethod('PUT', updateBookPriceIntegration);
    addCorsOptions(books);
  }
}

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod('OPTIONS', new MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    passthroughBehavior: PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }]
  })
}

const app = new App();
new PegPrice(app, 'PegPrice');
app.synth();
