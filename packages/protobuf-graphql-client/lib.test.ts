import { Client } from './lib';
import { buildSchema } from 'graphql';
import { readFixtureSync } from '../testUtils';
const schema = buildSchema(readFixtureSync('schemaSDL.graphql'));
const query = readFixtureSync('testQuery.graphql');

xit('works', async done => {
  const c = new Client('http://localhost:3001', schema);
  const res = await c.query(query);
  expect(res).toMatchInlineSnapshot(`
Object {
  "data": Object {
    "both": Object {
      "alias": 42,
      "number": 42,
      "string": "foo",
    },
    "test": Object {
      "string": "foo",
    },
    "x": Object {
      "number": 42,
    },
    "testReq": Object {
      "string": "req string",
    },
  },
}
`);
  done();
});

it('benchmark encoding works (big)', async done => {
  const benchmarkSchema = buildSchema(
    readFixtureSync('benchmark/benchmark-schema.graphql')
  );
  const benchmarkQuery = readFixtureSync(
    'benchmark/big/benchmark-query-nofragments.graphql'
  );

  const benchmarkResponse = JSON.parse(
    readFixtureSync('benchmark/big/benchmark-response.json')
  );
  const c = new Client('http://localhost:3002/bigQuery', benchmarkSchema);
  const res = await c.query(benchmarkQuery);
  expect(res).toEqual(benchmarkResponse);
  done();
});

it('benchmark encoding works (small)', async done => {
  const benchmarkSchema = buildSchema(
    readFixtureSync('benchmark/benchmark-schema.graphql')
  );
  const benchmarkQuery = readFixtureSync(
    'benchmark/small/benchmark-query-nofragments.graphql'
  );

  const benchmarkResponse = JSON.parse(
    readFixtureSync('benchmark/small/benchmark-response.json')
  );
  const c = new Client('http://localhost:3002/smallQuery', benchmarkSchema);
  const res = await c.query(benchmarkQuery);
  expect(res).toEqual(benchmarkResponse);
  done();
});
