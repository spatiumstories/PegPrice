import * as AWS from 'aws-sdk';

const TABLE_NAME = process.env.TABLE_NAME || '';

const db = new AWS.DynamoDB.DocumentClient();


export const handler = async (event: any = {}): Promise<any> => {


  if (!event.body) {
    return { statusCode: 400, body: 'invalid request, you are missing the parameter body' };
  }
  const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);

  try {
    const nft_param = {
        TableName: TABLE_NAME,
        Item: item
    };
    await db.put(nft_param).promise();
    return {statusCode: 200, body: "Success!"}
  } catch (dbError) {
    return {statusCode: 500, body: JSON.stringify(dbError)}
  }
};
