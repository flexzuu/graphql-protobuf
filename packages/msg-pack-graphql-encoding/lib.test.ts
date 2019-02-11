import {
  addQueryResMsgToNamespace,
  addReqMsgToNamespace,
  createRoot,
  createRootWithQueries,
} from './lib';
import { buildSchema, execute, parse } from 'graphql';
import { loadSync, Root } from 'protobufjs';
import { cloneDeepWith } from 'lodash';
import { writeFileSync } from 'fs';

const schemaSDL = `
type Test {
  string: String
  number: Int
}

type Query {
  test: Test
}
`;
const query = `
query testQuery {
  test {
    string
  }
  x: test {
    number
  }
  both: test {
    number
    string
    alias: number
  }
}

`;

const root = loadSync('fixtures/testQuery.proto');

const schema = buildSchema(schemaSDL);

it('constructs the correct protobuf', () => {
  const { namespace: ns } = createRoot();
  addReqMsgToNamespace(ns);
  addQueryResMsgToNamespace(query, schema, ns);
  expect(ns.toJSON()).toEqual(root.get('graphql')!.toJSON());
});

it('constructs the correct protobuf createRootWithQueries', () => {
  const { namespace } = createRootWithQueries([query], schema);
  expect(namespace.toJSON()).toEqual(root.get('graphql')!.toJSON());
});

it('serializes the data', () => {
  const { namespace: ns, root: actualRoot } = createRoot();
  addReqMsgToNamespace(ns);
  addQueryResMsgToNamespace(query, schema, ns);
  var ResponseMessage = actualRoot.lookupType('graphql.Response_testQuery');
  const payload = {
    data: {
      both: {
        string: 'foo',
        number: 42,
      },
      test: null,
      x: null,
    },
  };

  // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
  const errMsg = ResponseMessage.verify(payload);
  if (errMsg) throw Error(errMsg);

  // Create a new message
  const message = ResponseMessage.create(payload); // or use .fromObject if conversion is necessary

  // Encode a message to an Uint8Array (browser) or Buffer (node)
  const buffer = ResponseMessage.encode(message).finish();
  // ... do something with buffer

  // Decode an Uint8Array (browser) or Buffer (node) to a message
  const response = ResponseMessage.decode(buffer);
  // ... do something with message
  expect(response.toJSON().data.both).toEqual(payload.data.both);
  expect(response.toJSON().data.test).toBeUndefined();
  expect(response.toJSON().data.x).toBeUndefined();

  // ... do something with message

  expect(response.toJSON().data.both).toEqual(payload.data.both);
  expect(response.toJSON().data.test).toBeUndefined();
  expect(response.toJSON().data.x).toBeUndefined();
});

it('full round trip', () => {
  const { namespace: ns, root: actualRoot } = createRoot();
  addReqMsgToNamespace(ns);
  addQueryResMsgToNamespace(query, schema, ns);
  var ResponseMessage = actualRoot.lookupType('graphql.Response_testQuery');
  var RequestMessage = actualRoot.lookupType('graphql.Request');
  const req = {
    query,
  };
  // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
  let errMsg = RequestMessage.verify(req);
  if (errMsg) throw Error(errMsg);

  // Create a new message
  const reqMsg = RequestMessage.create(req); // or use .fromObject if conversion is necessary

  // Encode a message to an Uint8Array (browser) or Buffer (node)
  const bufferReq = RequestMessage.encode(reqMsg).finish();
  writeFileSync('./fixtures/reqbuffer', bufferReq);
  // send over the wire

  //gqlServer
  const reqJSON = RequestMessage.decode(bufferReq).toJSON();
  const res = cloneDeepWith(
    execute(schema, parse(reqJSON.query), {
      test: {
        string: 'foo',
        number: 42,
      },
    })
  );

  errMsg = ResponseMessage.verify(res);
  if (errMsg) throw Error(errMsg);

  const resMsg = ResponseMessage.create(res);
  const bufferRes = ResponseMessage.encode(resMsg).finish();

  const resJSON = ResponseMessage.decode(bufferRes).toJSON();
  expect(JSON.stringify(resJSON, null, 2)).toMatchInlineSnapshot(`
"{
  \\"data\\": {
    \\"test\\": {
      \\"string\\": \\"foo\\"
    },
    \\"x\\": {
      \\"number\\": 42
    },
    \\"both\\": {
      \\"number\\": 42,
      \\"string\\": \\"foo\\",
      \\"alias\\": 42
    }
  }
}"
`);
});
