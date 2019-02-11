import express from 'express';
import bodyParser from 'body-parser';
import { cloneDeepWith } from 'lodash';
import {
  createRoot,
  addReqMsgToNamespace,
  addQueryResMsgToNamespace,
} from '../protobuf-graphql-encoding/index';
import { execute, buildSchema, parse } from 'graphql';
import { readFileSync } from 'fs';

const app = express();
const schema = buildSchema(
  readFileSync('./fixtures/schemaSDL.graphql', { encoding: 'utf8' })
);
app.use(
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
    var RequestMessage = root.lookupType('graphql_server.Request');
    const reqJSON = RequestMessage.decode(req.body).toJSON();
    const query = reqJSON.query;
    const data = cloneDeepWith(
      execute(schema, parse(query), {
        test: {
          string: 'foo',
          number: 42,
        },
      })
    );

    addQueryResMsgToNamespace(query, schema, ns);
    var ResponseMessage = root.lookupType('graphql_server.Response_testQuery');

    const errMsg = ResponseMessage.verify(data);
    if (errMsg) throw Error(errMsg);

    const resMsg = ResponseMessage.create(data);
    const bufferRes = ResponseMessage.encode(resMsg).finish();

    res.type('application/octet-stream');
    res.send(Buffer.from(bufferRes));
  } else if (req.headers['content-type'] === 'application/json') {
    const data = execute(schema, parse(req.body.query), {
      test: {
        string: 'foo',
        number: 42,
      },
    });
    res.type('application/json');
    res.send(JSON.stringify(data));
  }
  next();
});
app.listen('3001', () => {
  console.log('started example server on port 3001');
});
