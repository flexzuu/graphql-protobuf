import express from 'express';
import bodyParser from 'body-parser';
import { cloneDeepWith } from 'lodash';
import {
  createRoot,
  addReqMsgToNamespace,
  addQueryResMsgToNamespace,
} from '../msg-pack-graphql-encoding/index';
import { execute, buildSchema, parse } from 'graphql';
import { readFileSync } from 'fs';

const app = express();
const schema = buildSchema(
  readFileSync('./fixtures/schemaSDL.graphql', { encoding: 'utf8' })
);
app.use(
  bodyParser.raw({
    type: 'application/gqlproto',
  })
);
app.all('/', function(req, res, next) {
  if (req.headers['content-type'] === 'application/gqlproto') {
    const { namespace: ns, root } = createRoot('graphql_server');
    addReqMsgToNamespace(ns);
    var RequestMessage = root.lookupType('graphql_server.Request');
    console.log(req.body);
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
    if (req.header('json')) {
      res.type('application/json');
      res.send(JSON.stringify(data));
    } else {
      res.type('application/octet-stream');
      res.send(Buffer.from(bufferRes));
    }
  } else {
    res.send(req.headers);
  }
  next();
});
app.listen('3001', () => {
  console.log('started example server on port 3001');
});
