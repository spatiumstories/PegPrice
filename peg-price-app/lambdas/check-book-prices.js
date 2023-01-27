import * as AWS from 'aws-sdk';
import Deso from 'deso-protocol';
import FormData from 'form-data';
import fetch from 'node-fetch';

const TABLE_NAME = process.env.TABLE_NAME || '';
const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
const SPATIUM_PUBLISHER_KEY = "BC1YLjC6xgSaoesmZmBgAWFxuxVTAaaAySQbiuSnCfb5eBBiWs4QgfP";
const PRICE_COL = process.env.PRICE_COL || '';

const db = new AWS.DynamoDB.DocumentClient();
const deso = new Deso();


export const handler = async () => {

  // 1. Get all books from the DB
  const params = {
    TableName: TABLE_NAME,
  };
  const books = await db.scan(params).promise().catch(dbError => {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  });

  let postHashHexes = [];
  let priceMap = new Map();
  let updatePriceMap = new Map();
  const exchangeRates = await deso.metaData.getExchangeRate();
  const exchangeRate = exchangeRates['USDCentsPerDeSoExchangeRate'];

  // 2. Go through each postHashHex and add to a list
  books.Items.forEach(book => {
    postHashHexes.push(book[PRIMARY_KEY]);
    let usdPrice = parseFloat(book[PRICE_COL]) * 100.0;
    let desoPrice = ((1 / exchangeRate) * usdPrice).toFixed(3);
    let nanos = desoPrice * 1e9;
    priceMap.set(book[PRIMARY_KEY], nanos);
  });

  // 3. Go through each postHashHex in list and fetch current data from Deso to see which are owned
  //    by SpatiumPublisher. Any serials still owned are added to a list and inputted into updatePrice map
  for (let postHashHex of postHashHexes) {
    const request = {
      "PostHashHex": postHashHex
    };
    const nftEntries = await deso.nft.getNftEntriesForPostHash(request);
    const nfts = nftEntries !== null ? nftEntries['NFTEntryResponses'] : [];
    let serialsOwned = [];
    nfts.forEach(nft => {
        if (nft['OwnerPublicKeyBase58Check'] === SPATIUM_PUBLISHER_KEY) {
            serialsOwned.push(nft['SerialNumber']);
        }
    });
    updatePriceMap.set(postHashHex, serialsOwned);
  };


  // 4. Update Price
  for (var postHashHex of updatePriceMap.keys()) {
    const formData = new FormData();
    // formData.append('api_key', ADMIN_KEY);
    formData.append('post_hash_hex', postHashHex);
    formData.append('price', priceMap.get(postHashHex));
    formData.append('serials', updatePriceMap.get(postHashHex).toString());
    const requestOptions = {
      method: 'POST',
      body: formData,
    };
    let uri = 'https://api.spatiumstories.xyz';
    const response = await fetch(`${uri}/api/change-price`, requestOptions)
    .then(response => response.text())
    .then(data => {
      console.log(data);
    }).catch(e => {
        console.log(e);
    });  
  }

  return { statusCode: 200, body: JSON.stringify(updatePriceMap) };
};