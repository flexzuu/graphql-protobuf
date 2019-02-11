import express from 'express';
import { createRoot } from 'msg-pack-graphql-encoding';

const app = express();
const { namespace: ns } = createRoot('graphql_server');
addReqMsgToNamespace(ns);

app.all('/', function(req, res, next) {
  //addQueryResMsgToNamespace(query, schema, ns);

  res.send('POST request to the homepage.');
  next();
});
app.listen('3001', () => {
  console.log('started example server on port 3001');
});
