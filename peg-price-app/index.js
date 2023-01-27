"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCorsOptions = exports.PegPrice = void 0;
const aws_apigateway_1 = require("aws-cdk-lib/aws-apigateway");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const path_1 = require("path");
const aws_events_1 = require("aws-cdk-lib/aws-events");
const aws_events_targets_1 = require("aws-cdk-lib/aws-events-targets");
class PegPrice extends aws_cdk_lib_1.Stack {
    constructor(app, id) {
        super(app, id);
        const dynamoTable = new aws_dynamodb_1.Table(this, 'PricePeggedBooks', {
            partitionKey: {
                name: 'postHashHex',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            readCapacity: 1,
            writeCapacity: 1,
            tableName: 'PricePeggedBooks',
            /**
             *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
             * the new table, and it will remain in your account until manually deleted. By setting the policy to
             * DESTROY, cdk destroy will delete the table (even if it has data in it)
             */
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY, // NOT recommended for production code
        });
        const nodeJsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
                ],
            },
            depsLockFilePath: (0, path_1.join)(__dirname, 'lambdas', 'package-lock.json'),
            environment: {
                PRIMARY_KEY: 'postHashHex',
                TABLE_NAME: dynamoTable.tableName,
                PRICE_COL: 'price'
            },
            runtime: aws_lambda_1.Runtime.NODEJS_14_X,
        };
        // Create a Lambda function for each of the CRUD operations
        // Lambdas needed:
        // 1. Add RARE book
        // 2. Scheduled Lambda that takes all RARE books, checks Deso for current ownership, pays author, and deletes item
        const addBookPrice = new aws_lambda_nodejs_1.NodejsFunction(this, 'addBookPrice', {
            entry: (0, path_1.join)(__dirname, 'lambdas', 'add-book-price.ts'),
            ...nodeJsFunctionProps,
        });
        const checkBookPrices = new aws_lambda_nodejs_1.NodejsFunction(this, 'checkBookPrices', {
            entry: (0, path_1.join)(__dirname, 'lambdas', 'check-book-prices.js'),
            ...nodeJsFunctionProps,
        });
        const deleteBookPrice = new aws_lambda_nodejs_1.NodejsFunction(this, 'deleteBookPrice', {
            entry: (0, path_1.join)(__dirname, 'lambdas', 'delete-book-price.ts'),
            ...nodeJsFunctionProps,
        });
        const updateBookPrice = new aws_lambda_nodejs_1.NodejsFunction(this, 'updateBookPrice', {
            entry: (0, path_1.join)(__dirname, 'lambdas', 'update-book-price.ts'),
            ...nodeJsFunctionProps,
        });
        // Grant the Lambda function read access to the DynamoDB table
        dynamoTable.grantReadWriteData(addBookPrice);
        dynamoTable.grantReadWriteData(checkBookPrices);
        dynamoTable.grantReadWriteData(deleteBookPrice);
        dynamoTable.grantReadWriteData(updateBookPrice);
        // Create schedule for checkRareBooks lambda
        const eventRule = new aws_events_1.Rule(this, 'scheduleRule', {
            schedule: aws_events_1.Schedule.expression('rate(6 hours)'),
        });
        eventRule.addTarget(new aws_events_targets_1.LambdaFunction(checkBookPrices));
        // Integrate the Lambda functions with the API Gateway resource
        const addBookPriceIntegration = new aws_apigateway_1.LambdaIntegration(addBookPrice);
        const deleteBookPriceIntegration = new aws_apigateway_1.LambdaIntegration(deleteBookPrice);
        const updateBookPriceIntegration = new aws_apigateway_1.LambdaIntegration(updateBookPrice);
        // Create an API Gateway resource for each of the CRUD operations
        const api = new aws_apigateway_1.RestApi(this, 'pegPriceAPI', {
            restApiName: 'Peg Price API'
        });
        const books = api.root.addResource('api');
        books.addMethod('POST', addBookPriceIntegration);
        books.addMethod('DELETE', deleteBookPriceIntegration);
        books.addMethod('PUT', updateBookPriceIntegration);
        addCorsOptions(books);
    }
}
exports.PegPrice = PegPrice;
function addCorsOptions(apiResource) {
    apiResource.addMethod('OPTIONS', new aws_apigateway_1.MockIntegration({
        integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                    'method.response.header.Access-Control-Allow-Credentials': "'false'",
                    'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
                },
            }],
        passthroughBehavior: aws_apigateway_1.PassthroughBehavior.NEVER,
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
    });
}
exports.addCorsOptions = addCorsOptions;
const app = new aws_cdk_lib_1.App();
new PegPrice(app, 'PegPrice');
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrREFBeUg7QUFDekgsMkRBQWdFO0FBQ2hFLHVEQUFpRDtBQUNqRCw2Q0FBd0Q7QUFDeEQscUVBQW9GO0FBQ3BGLCtCQUEyQjtBQUMzQix1REFBd0Q7QUFDeEQsdUVBQWdFO0FBRWhFLE1BQWEsUUFBUyxTQUFRLG1CQUFLO0lBQ2pDLFlBQVksR0FBUSxFQUFFLEVBQVU7UUFDOUIsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVmLE1BQU0sV0FBVyxHQUFHLElBQUksb0JBQUssQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDdEQsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxhQUFhO2dCQUNuQixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsWUFBWSxFQUFFLENBQUM7WUFDZixhQUFhLEVBQUUsQ0FBQztZQUNoQixTQUFTLEVBQUUsa0JBQWtCO1lBRTdCOzs7O2VBSUc7WUFDSCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPLEVBQUUsc0NBQXNDO1NBQzdFLENBQUMsQ0FBQztRQUVILE1BQU0sbUJBQW1CLEdBQXdCO1lBQy9DLFFBQVEsRUFBRTtnQkFDUixlQUFlLEVBQUU7b0JBQ2YsU0FBUyxFQUFFLG9EQUFvRDtpQkFDaEU7YUFDRjtZQUNELGdCQUFnQixFQUFFLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsbUJBQW1CLENBQUM7WUFDakUsV0FBVyxFQUFFO2dCQUNYLFdBQVcsRUFBRSxhQUFhO2dCQUMxQixVQUFVLEVBQUUsV0FBVyxDQUFDLFNBQVM7Z0JBQ2pDLFNBQVMsRUFBRSxPQUFPO2FBQ25CO1lBQ0QsT0FBTyxFQUFFLG9CQUFPLENBQUMsV0FBVztTQUM3QixDQUFBO1FBRUQsMkRBQTJEO1FBQzNELGtCQUFrQjtRQUNsQixtQkFBbUI7UUFDbkIs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QXFELEVBQUUsK0JBQStCO2lCQUN2RjthQUNGLENBQUM7UUFDRixtQkFBbUIsRUFBRSxvQ0FBbUIsQ0FBQyxLQUFLO1FBQzlDLGdCQUFnQixFQUFFO1lBQ2hCLGtCQUFrQixFQUFFLHVCQUF1QjtTQUM1QztLQUNGLENBQUMsRUFBRTtRQUNGLGVBQWUsRUFBRSxDQUFDO2dCQUNoQixVQUFVLEVBQUUsS0FBSztnQkFDakIsa0JBQWtCLEVBQUU7b0JBQ2xCLHFEQUFxRCxFQUFFLElBQUk7b0JBQzNELHFEQUFxRCxFQUFFLElBQUk7b0JBQzNELHlEQUF5RCxFQUFFLElBQUk7b0JBQy9ELG9EQUFvRCxFQUFFLElBQUk7aUJBQzNEO2FBQ0YsQ0FBQztLQUNILENBQUMsQ0FBQTtBQUNKLENBQUM7QUExQkQsd0NBMEJDO0FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxpQkFBRyxFQUFFLENBQUM7QUFDdEIsSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQzlCLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IElSZXNvdXJjZSwgTGFtYmRhSW50ZWdyYXRpb24sIE1vY2tJbnRlZ3JhdGlvbiwgUGFzc3Rocm91Z2hCZWhhdmlvciwgUmVzdEFwaSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCB7IEF0dHJpYnV0ZVR5cGUsIFRhYmxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCB7IFJ1bnRpbWUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCB7IEFwcCwgU3RhY2ssIFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBOb2RlanNGdW5jdGlvbiwgTm9kZWpzRnVuY3Rpb25Qcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgUnVsZSwgU2NoZWR1bGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcbmltcG9ydCB7IExhbWJkYUZ1bmN0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cy10YXJnZXRzJztcblxuZXhwb3J0IGNsYXNzIFBlZ1ByaWNlIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgaWQ6IHN0cmluZykge1xuICAgIHN1cGVyKGFwcCwgaWQpO1xuXG4gICAgY29uc3QgZHluYW1vVGFibGUgPSBuZXcgVGFibGUodGhpcywgJ1ByaWNlUGVnZ2VkQm9va3MnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogJ3Bvc3RIYXNoSGV4JyxcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcbiAgICAgIH0sXG4gICAgICByZWFkQ2FwYWNpdHk6IDEsXG4gICAgICB3cml0ZUNhcGFjaXR5OiAxLFxuICAgICAgdGFibGVOYW1lOiAnUHJpY2VQZWdnZWRCb29rcycsXG5cbiAgICAgIC8qKlxuICAgICAgICogIFRoZSBkZWZhdWx0IHJlbW92YWwgcG9saWN5IGlzIFJFVEFJTiwgd2hpY2ggbWVhbnMgdGhhdCBjZGsgZGVzdHJveSB3aWxsIG5vdCBhdHRlbXB0IHRvIGRlbGV0ZVxuICAgICAgICogdGhlIG5ldyB0YWJsZSwgYW5kIGl0IHdpbGwgcmVtYWluIGluIHlvdXIgYWNjb3VudCB1bnRpbCBtYW51YWxseSBkZWxldGVkLiBCeSBzZXR0aW5nIHRoZSBwb2xpY3kgdG9cbiAgICAgICAqIERFU1RST1ksIGNkayBkZXN0cm95IHdpbGwgZGVsZXRlIHRoZSB0YWJsZSAoZXZlbiBpZiBpdCBoYXMgZGF0YSBpbiBpdClcbiAgICAgICAqL1xuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBOT1QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24gY29kZVxuICAgIH0pO1xuXG4gICAgY29uc3Qgbm9kZUpzRnVuY3Rpb25Qcm9wczogTm9kZWpzRnVuY3Rpb25Qcm9wcyA9IHtcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogW1xuICAgICAgICAgICdhd3Mtc2RrJywgLy8gVXNlIHRoZSAnYXdzLXNkaycgYXZhaWxhYmxlIGluIHRoZSBMYW1iZGEgcnVudGltZVxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGRlcHNMb2NrRmlsZVBhdGg6IGpvaW4oX19kaXJuYW1lLCAnbGFtYmRhcycsICdwYWNrYWdlLWxvY2suanNvbicpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUFJJTUFSWV9LRVk6ICdwb3N0SGFzaEhleCcsXG4gICAgICAgIFRBQkxFX05BTUU6IGR5bmFtb1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUFJJQ0VfQ09MOiAncHJpY2UnXG4gICAgICB9LFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMTRfWCxcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBMYW1iZGEgZnVuY3Rpb24gZm9yIGVhY2ggb2YgdGhlIENSVUQgb3BlcmF0aW9uc1xuICAgIC8vIExhbWJkYXMgbmVlZGVkOlxuICAgIC8vIDEuIEFkZCBSQVJFIGJvb2tcbiAgICAvLyAyLiBTY2hlZHVsZWQgTGFtYmRhIHRoYXQgdGFrZXMgYWxsIFJBUkUgYm9va3MsIGNoZWNrcyBEZXNvIGZvciBjdXJyZW50IG93bmVyc2hpcCwgcGF5cyBhdXRob3IsIGFuZCBkZWxldGVzIGl0ZW1cbiAgICBjb25zdCBhZGRCb29rUHJpY2UgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ2FkZEJvb2tQcmljZScsIHtcbiAgICAgIGVudHJ5OiBqb2luKF9fZGlybmFtZSwgJ2xhbWJkYXMnLCAnYWRkLWJvb2stcHJpY2UudHMnKSxcbiAgICAgIC4uLm5vZGVKc0Z1bmN0aW9uUHJvcHMsXG4gICAgfSk7XG4gICAgY29uc3QgY2hlY2tCb29rUHJpY2VzID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdjaGVja0Jvb2tQcmljZXMnLCB7XG4gICAgICBlbnRyeTogam9pbihfX2Rpcm5hbWUsICdsYW1iZGFzJywgJ2NoZWNrLWJvb2stcHJpY2VzLmpzJyksXG4gICAgICAuLi5ub2RlSnNGdW5jdGlvblByb3BzLFxuICAgIH0pO1xuICAgIGNvbnN0IGRlbGV0ZUJvb2tQcmljZSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnZGVsZXRlQm9va1ByaWNlJywge1xuICAgICAgZW50cnk6IGpvaW4oX19kaXJuYW1lLCAnbGFtYmRhcycsICdkZWxldGUtYm9vay1wcmljZS50cycpLFxuICAgICAgLi4ubm9kZUpzRnVuY3Rpb25Qcm9wcyxcbiAgICB9KTtcbiAgICBjb25zdCB1cGRhdGVCb29rUHJpY2UgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ3VwZGF0ZUJvb2tQcmljZScsIHtcbiAgICAgIGVudHJ5OiBqb2luKF9fZGlybmFtZSwgJ2xhbWJkYXMnLCAndXBkYXRlLWJvb2stcHJpY2UudHMnKSxcbiAgICAgIC4uLm5vZGVKc0Z1bmN0aW9uUHJvcHMsXG4gICAgfSk7XG5cblxuICAgIC8vIEdyYW50IHRoZSBMYW1iZGEgZnVuY3Rpb24gcmVhZCBhY2Nlc3MgdG8gdGhlIER5bmFtb0RCIHRhYmxlXG4gICAgZHluYW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFkZEJvb2tQcmljZSk7XG4gICAgZHluYW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNoZWNrQm9va1ByaWNlcyk7XG4gICAgZHluYW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGRlbGV0ZUJvb2tQcmljZSk7XG4gICAgZHluYW1vVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZUJvb2tQcmljZSk7XG5cbiAgICAvLyBDcmVhdGUgc2NoZWR1bGUgZm9yIGNoZWNrUmFyZUJvb2tzIGxhbWJkYVxuICAgIGNvbnN0IGV2ZW50UnVsZSA9IG5ldyBSdWxlKHRoaXMsICdzY2hlZHVsZVJ1bGUnLCB7XG4gICAgICBzY2hlZHVsZTogU2NoZWR1bGUuZXhwcmVzc2lvbigncmF0ZSg2IGhvdXJzKScpLFxuICAgIH0pO1xuICAgIGV2ZW50UnVsZS5hZGRUYXJnZXQobmV3IExhbWJkYUZ1bmN0aW9uKGNoZWNrQm9va1ByaWNlcykpO1xuXG4gICAgLy8gSW50ZWdyYXRlIHRoZSBMYW1iZGEgZnVuY3Rpb25zIHdpdGggdGhlIEFQSSBHYXRld2F5IHJlc291cmNlXG4gICAgY29uc3QgYWRkQm9va1ByaWNlSW50ZWdyYXRpb24gPSBuZXcgTGFtYmRhSW50ZWdyYXRpb24oYWRkQm9va1ByaWNlKTtcbiAgICBjb25zdCBkZWxldGVCb29rUHJpY2VJbnRlZ3JhdGlvbiA9IG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihkZWxldGVCb29rUHJpY2UpO1xuICAgIGNvbnN0IHVwZGF0ZUJvb2tQcmljZUludGVncmF0aW9uID0gbmV3IExhbWJkYUludGVncmF0aW9uKHVwZGF0ZUJvb2tQcmljZSk7XG5cblxuICAgIC8vIENyZWF0ZSBhbiBBUEkgR2F0ZXdheSByZXNvdXJjZSBmb3IgZWFjaCBvZiB0aGUgQ1JVRCBvcGVyYXRpb25zXG4gICAgY29uc3QgYXBpID0gbmV3IFJlc3RBcGkodGhpcywgJ3BlZ1ByaWNlQVBJJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdQZWcgUHJpY2UgQVBJJ1xuICAgIH0pO1xuXG4gICAgY29uc3QgYm9va3MgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnYXBpJyk7XG4gICAgYm9va3MuYWRkTWV0aG9kKCdQT1NUJywgYWRkQm9va1ByaWNlSW50ZWdyYXRpb24pO1xuICAgIGJvb2tzLmFkZE1ldGhvZCgnREVMRVRFJywgZGVsZXRlQm9va1ByaWNlSW50ZWdyYXRpb24pO1xuICAgIGJvb2tzLmFkZE1ldGhvZCgnUFVUJywgdXBkYXRlQm9va1ByaWNlSW50ZWdyYXRpb24pO1xuICAgIGFkZENvcnNPcHRpb25zKGJvb2tzKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkQ29yc09wdGlvbnMoYXBpUmVzb3VyY2U6IElSZXNvdXJjZSkge1xuICBhcGlSZXNvdXJjZS5hZGRNZXRob2QoJ09QVElPTlMnLCBuZXcgTW9ja0ludGVncmF0aW9uKHtcbiAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcbiAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIidDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbixYLUFtei1Vc2VyLUFnZW50J1wiLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IFwiJ2ZhbHNlJ1wiLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInT1BUSU9OUyxHRVQsUFVULFBPU1QsREVMRVRFJ1wiLFxuICAgICAgfSxcbiAgICB9XSxcbiAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiBQYXNzdGhyb3VnaEJlaGF2aW9yLk5FVkVSLFxuICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiBcIntcXFwic3RhdHVzQ29kZVxcXCI6IDIwMH1cIlxuICAgIH0sXG4gIH0pLCB7XG4gICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xuICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWUsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlLFxuICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6IHRydWUsXG4gICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICB9LFxuICAgIH1dXG4gIH0pXG59XG5cbmNvbnN0IGFwcCA9IG5ldyBBcHAoKTtcbm5ldyBQZWdQcmljZShhcHAsICdQZWdQcmljZScpO1xuYXBwLnN5bnRoKCk7XG4iXX0=