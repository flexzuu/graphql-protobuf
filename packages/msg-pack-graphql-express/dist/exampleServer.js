"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const msg_pack_graphql_encoding_1 = require("msg-pack-graphql-encoding");
const app = express_1.default();
const { namespace: ns } = msg_pack_graphql_encoding_1.createRoot('graphql_server');
addReqMsgToNamespace(ns);
app.all('/', function (req, res, next) {
    //addQueryResMsgToNamespace(query, schema, ns);
    res.send('POST request to the homepage.');
    next();
});
app.listen('3001', () => {
    console.log('started example server on port 3001');
});
