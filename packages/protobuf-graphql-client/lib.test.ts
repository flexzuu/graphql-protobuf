import { Client } from './lib';
import { buildSchema, parse } from 'graphql';
import { readFileSync } from 'fs';
const schema = buildSchema(
  readFileSync('./fixtures/schemaSDL.graphql', { encoding: 'utf8' })
);
const query = parse(
  readFileSync('./fixtures/testQuery.graphql', { encoding: 'utf8' })
);
it('works', async done => {
  const c = new Client('http://localhost:3001', schema);
  const res = await c.query(query);
  expect(res).toMatchInlineSnapshot();
});
