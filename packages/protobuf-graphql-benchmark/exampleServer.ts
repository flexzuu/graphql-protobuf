import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';

import {
  createRootFromQuery
} from '../protobuf-graphql-encoding/index';
import { buildSchema } from 'graphql';
import { readFileSync } from 'fs';
const converter = require("protobufjs/cli/targets/proto3.js")
const app = express();
const schema = buildSchema(
  readFileSync('./fixtures/benchmark/benchmark-schema.graphql', {
    encoding: 'utf8',
  })
);
const queryBig = readFileSync(
  './fixtures/benchmark/big/benchmark-query-nofragments.graphql',
  { encoding: 'utf8' }
);
const benchmarkResponseBig = JSON.parse(
  readFileSync('./fixtures/benchmark/big/benchmark-response.json', {
    encoding: 'utf8',
  })
);
const querySmall = readFileSync(
  './fixtures/benchmark/small/benchmark-query-nofragments.graphql',
  { encoding: 'utf8' }
);
const benchmarkResponseSmall = JSON.parse(
  readFileSync('./fixtures/benchmark/small/benchmark-response.json', {
    encoding: 'utf8',
  })
);
app.use(
  compression(),
  bodyParser.raw({
    type: 'application/gqlproto',
  }),
  bodyParser.json({
    type: 'application/json',
  })
);
app.all('/:queryName', function(req, res, next) {
  const queryName = req.params.queryName
  let query: string
  let benchmarkResponse: object
  switch (queryName) {
    case 'bigQuery':
      query = queryBig
      benchmarkResponse = benchmarkResponseBig
      break;
  
    case 'smallQuery':
      query = querySmall
      benchmarkResponse = benchmarkResponseSmall
      break;
  
    default:
    query=""
    benchmarkResponse = {}
      break;
  }
  if (req.headers['content-type'] === 'application/gqlproto') {
    const { root, ResponseMessage } = createRootFromQuery(query, schema);
    converter(root,{}, (error:any , data:any) => console.log(data))

    const errMsg = ResponseMessage.verify(benchmarkResponse);
    if (errMsg) throw Error(errMsg);

    const resMsg = ResponseMessage.create(benchmarkResponse);
    const bufferRes = ResponseMessage.encode(resMsg).finish();

    res.type('application/octet-stream');
    res.send(Buffer.from(bufferRes));
  } else if (req.headers['content-type'] === 'application/json') {
    res.type('application/json');
    res.send(JSON.stringify(benchmarkResponse));
  }
  next();
});
app.listen('3002', () => {
  console.log('started example server on port 3002');
});
