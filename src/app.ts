import { json } from 'body-parser';
import { merge } from 'config-plus';
import dotenv from 'dotenv';
import express from 'express';
import * as http from 'http';
import { Db } from 'mongodb';
import { connectToDb } from 'mongodb-extension';
import { config, env } from './config';
import { useContext } from './context';

dotenv.config();
const conf = merge(config, process.env, env, process.env.ENV);

const app = express();
app.use(json());

const sub = express();
sub.use(json());

connectToDb(`${conf.mongo.uri}`, `${conf.mongo.db}`).then((db: Db) => {
  const ctx = useContext(db, conf);
  // Change consume in context from 'queue' to 'subscribe' and vice versa
  ctx.consume(ctx.handle);
  sub.get('/health', ctx.health.check);
  sub.patch('/log', ctx.log.config);
  app.post('/post', (req, res) => {
    // Change method to 'publish' for topic and 'queue' for queue
    ctx.publisher.publish(req.body).catch(err => {
      res.json({ error: err });
    });
    res.json({ message: 'message was published' });
  });
  http.createServer(app).listen(conf.port, () => {
    console.log('Start server at port ' + conf.port);
  });
  http.createServer(sub).listen(conf.sub_port, () => {
    console.log('Start sub server at port ' + conf.sub_port);
  });
});
