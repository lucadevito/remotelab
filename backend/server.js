require('rootpath')();
const GuacamoleLite = require('guacamole-lite');
const express = require('express');
const http = require('http');

const serverApp = express();
const guacamoleApp = express();
const cors = require('cors');
const jwt = require('_helpers/jwt');
const errorHandler = require('_helpers/error-handler');


serverApp.use(express.urlencoded({ extended: false }));
serverApp.use(express.json());
serverApp.use(cors());

// use JWT auth to secure the api
serverApp.use(jwt());

// api routes
serverApp.use('/users', require('./users/users.controller'));
serverApp.use('/experiments', require('./experiments/experiments.controller'));

// global error handler
serverApp.use(errorHandler);

// start server
const port = process.env.NODE_ENV === 'production' ? 80 : 4000;
const nodeAppServer = serverApp.listen(port, function () {
    console.log('Server listening on port ' + port);
});

const server = http.createServer(guacamoleApp);
const guacdOptions = {
    host: '127.0.0.1',
    port: 4822 // port of guacd
};

const clientOptions = {
    crypt: {
        cypher: 'AES-256-CBC',
        key: 'MySuperSecretKeyForParamsToken12'
    }
};

const guacServer = new GuacamoleLite(
    {server},
    guacdOptions,
    clientOptions
);
server.listen(8080, '0.0.0.0', function () {
    console.log('Guacamole server listening on port 8080');
});

process.on('SIGTERM', () => {
    server.close();
    guacServer.close();
    nodeAppServer.closeAllConnections();
    nodeAppServer.close();
});
process.on('SIGINT', () => {
    server.close();
    guacServer.close();
    nodeAppServer.closeAllConnections();
    nodeAppServer.close();
});
