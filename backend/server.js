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
const server = serverApp.listen(port, function () {
    console.log('Server listening on port ' + port);
});

const guacamoleServer = http.createServer(guacamoleApp);
const guacdOptions = {
    port: 4822 // port of guacd
};

const clientOptions = {
    crypt: {
        cypher: 'AES-256-CBC',
        key: 'MySuperSecretKeyForParamsToken12'
    }
};

const guacServer = new GuacamoleLite(
    {guacamoleServer},
    guacdOptions,
    clientOptions
);
guacamoleServer.listen(8000, function () {
    console.log('Guacamole server listening on port 8080');
});

process.on('SIGTERM', () => {
    guacamoleServer.close();
    guacServer.close();
    server.closeAllConnections();
    server.close();
});
process.on('SIGINT', () => {
    guacamoleServer.close();
    guacServer.close();
    server.closeAllConnections();
    server.close();
});
