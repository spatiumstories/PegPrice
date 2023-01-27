import * as AWS from 'aws-sdk';

const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: any = {}): Promise<any> => {

  if (!event.body) {
      return {statusCode: 400, body: 'Need postHashHex and serial number'};
  }

  const book = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
  const postHashHex = book[PRIMARY_KEY];

  const params = {
    TableName: TABLE_NAME,
    Key: {
      [PRIMARY_KEY]: postHashHex,
    }
  };

  try {
    await db.delete(params).promise();
    return { statusCode: 200, body: "success!" };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
