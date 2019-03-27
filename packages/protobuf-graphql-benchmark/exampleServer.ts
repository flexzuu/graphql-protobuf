import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';

import { cloneDeepWith } from 'lodash';
import {
  createRoot,
  addReqMsgToNamespace,
  addQueryResMsgToNamespace,
} from '../protobuf-graphql-encoding/index';
import { buildSchema } from 'graphql';
import { readFileSync, writeFileSync } from 'fs';
const converter = require("protobufjs/cli/targets/proto3.js")
const app = express();
const schema = buildSchema(
  readFileSync('./fixtures/benchmark/benchmark-schema.graphql', {
    encoding: 'utf8',
  })
);
const query = readFileSync(
  './fixtures/benchmark/benchmark-query-nofragments.graphql',
  { encoding: 'utf8' }
);
const data = JSON.parse(
  readFileSync('./fixtures/benchmark/benchmark-response.json', {
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
app.all('/', function(req, res, next) {
  if (req.headers['content-type'] === 'application/gqlproto') {
    const { namespace: ns, root } = createRoot('graphql_server');
    addReqMsgToNamespace(ns);
    converter(root,{}, (error:any , data:any) => console.log(data))
    var RequestMessage = root.lookupType('graphql_server.Request');

    addQueryResMsgToNamespace(query, schema, ns);
    var ResponseMessage = root.lookupType('graphql_server.Response_testQuery');

    const errMsg = ResponseMessage.verify(data);
    if (errMsg) throw Error(errMsg);

    const resMsg = ResponseMessage.create(data);
    const bufferRes = ResponseMessage.encode(resMsg).finish();

    res.type('application/octet-stream');
    res.send(Buffer.from(bufferRes));
  } else if (req.headers['content-type'] === 'application/json') {
    res.type('application/json');
    res.send(JSON.stringify(data));
  }
  next();
});
app.listen('3001', () => {
  console.log('started example server on port 3001');
});
