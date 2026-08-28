/**
 * Vercel Serverless Function entry point
 * Directs all /api/* requests to server.js connected to Neon Cloud PostgreSQL
 */

require('dotenv').config();
const app = require('../server.js');

module.exports = app;
