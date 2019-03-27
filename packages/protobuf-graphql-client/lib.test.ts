import { Client } from './lib';
import { buildSchema, parse } from 'graphql';
import { readFixtureSync } from '../testUtils';
const schema = buildSchema(readFixtureSync('schemaSDL.graphql'));
const query = parse(readFixtureSync('testQuery.graphql'));
const benchmarkSchema = buildSchema(readFixtureSync("benchmark/benchmark-schema.graphql"))
const benchmarkQuery = parse(readFixtureSync('benchmark/benchmark-query-nofragments.graphql'));
const benchmarkResponse = JSON.parse(readFixtureSync('benchmark/benchmark-response.json'))
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

it('benchmark encoding works', async done => {
  const c = new Client('http://localhost:3002', benchmarkSchema);
  const res = await c.query(benchmarkQuery);
  expect(res).toEqual(benchmarkResponse);
  done();
});