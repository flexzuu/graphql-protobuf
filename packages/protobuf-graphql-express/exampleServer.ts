import express from 'express';
import bodyParser from 'body-parser';
import { cloneDeepWith } from 'lodash';
import {
  createRootFromBody
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
    const { ResponseMessage, query } = createRootFromBody(req.body, schema);
    const data = cloneDeepWith(
      execute(schema, parse(query), {
        test: {
          string: 'foo',
          number: 42,
        },
      })
    );

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
