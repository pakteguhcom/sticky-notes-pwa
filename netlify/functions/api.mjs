import serverless from 'serverless-http';
import app from '../../src/app.mjs';

export const handler = serverless(app);
