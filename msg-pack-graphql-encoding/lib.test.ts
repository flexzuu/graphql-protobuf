import { test } from './lib';
import { buildSchema, execute, parse } from 'graphql';
import { loadSync, Root } from 'protobufjs';

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
  const actualRoot = new Root();
  const ns = actualRoot.define('graphql');
  test(query, schema, ns);
  expect(ns.toJSON()).toEqual(root.get('graphql').toJSON());
});

it('serializes the data', () => {
  const actualRoot = new Root();
  const ns = actualRoot.define('graphql');
  test(query, schema, ns);
  var ResponseMessage = actualRoot.lookupType('graphql.Response');
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
});
