const config = require('config.json');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const exp = require('constants');
const http = require('http');
const httpProxy = require('http-proxy');
const os = require("os");
const querystring = require('querystring');

const CIPHER = 'aes-256-cbc';
const SECRET_KEY = 'MySuperSecretKeyForParamsToken12';

const experiments = require('./experiments.json');
const { execPath } = require('process');

var pserverPortPool = [ {port:8888, available:true},
                        {port:8889, available:true},
                        {port:8890, available:true},
                        {port:8891, available:true},
                        {port:8892, available:true},
                        {port:8893, available:true},
                        {port:8894, available:true},
                        {port:8895, available:true},
                        {port:8896, available:true},
                        {port:8897, available:true}
                      ];

function nextAvailableProxyPort() {
  for (let i=0; i<pserverPortPool.length; i++)
    if (pserverPortPool[i].available)
      return pserverPortPool[i].port;
  return 0;
}

console.log(experiments);

var proxy = httpProxy.createProxyServer({});

proxy.on('proxyRes', function(proxyRes, req, res, options) {
  proxyRes.headers["access-control-allow-origin"] = "*";
});

module.exports = {
    getAll,
    startExperiment,
    stopExperiment
};

var activeProxyConnections = [];

var pserver = null;

function generateProxyToken(length){
  //edit the token allowed characters
  var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
  var b = [];  
  for (var i=0; i<length; i++) {
      var j = (Math.random() * (a.length-1)).toFixed(0);
      b[i] = a[j];
  }
  return b.join("");
}

function encryptToken(value) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(CIPHER, Buffer.from(SECRET_KEY), iv);
  
    let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'base64');
    encrypted += cipher.final('base64');
  
    const data = {
      iv: iv.toString('base64'),
      value: encrypted
    };
  
    const json = JSON.stringify(data);

    console.log('Token encrypted:')
    console.log(Buffer.from(json).toString('base64'));
    return Buffer.from(json).toString('base64');
}

function findValueByKey(conns, key) {
  var match = conns.filter(function(conn) {
    return conn.key === key;
  });
  return match[0] ? match[0] : null;
}

async function getAll() {

  returnedExperiments = [];

  experiments.forEach((item) => {
    var exp = {};
    exp.id = item.id;
    exp.title = item.title;
    exp.description = item.description;
    exp.resources = [];
    item.elements.forEach((el) => {
      var res = {};
      res.description = el.description;
      res.type = el.resource;
      res.width = el.width;
      res.height = el.height;
      res.path = el.path;
      res.value = '';
      exp.resources.push(res);
    });

    returnedExperiments.push(exp);
  });
  console.log('getAll(), returning '+JSON.stringify(returnedExperiments));
  return returnedExperiments;
}

async function startExperiment(experimentId) {
  
  console.log('startExperiment');

  console.log(experimentId.id);

  const exp = experiments.find(el => el.id === experimentId.id);
  
  console.log(exp.title);
  console.log(exp.elements);
  
  var valueList = [];

  for (let i = 0; i<exp.elements.length; i++) {
    if (exp.elements[i].resource == "screen") {
      console.log('screen resource');
      console.log(exp.elements[i].tokenObject);
      const token = encryptToken(exp.elements[i].tokenObject);
      console.log(token);
      //listTokens = [...listTokens, token]
      valueList[i] = {
        token: token
      };
    } else if (exp.elements[i].resource == "web") {

      const serverPort = nextAvailableProxyPort();

      if (serverPort === 0) return null;

      pserver = http.createServer(function(req, res) {
        console.log("Received web proxy request, url="+req.url);
        console.log("Local port="+req.socket.localPort);
  
        target = findValueByKey(activeProxyConnections,req.socket.localPort);
        if (target) {
          console.log("Retrieved target url="+target.url);

          // refresh timeout
          target.tid.refresh();

          // check token
          var reqToken = "";
    
          // check if token is sent in the url
          const urlSplit = req.url.split("?");
          var query = new URLSearchParams(urlSplit[1]);
          reqToken = query.get('proxytoken');
          if (reqToken) {
            console.log("Token in url: "+reqToken);
              
              // remove token from request and add path
              req.url = urlSplit[0];
              
              console.log('New req url='+req.url);
    
              console.log("Proxying the request");
              proxy.web(req, res, { target: target.url });
              res.setHeader('Set-Cookie','proxytoken='+reqToken);
          } else if (req.headers['cookie']) { // Check if token is sent with a cookie
            // split cookies
            const cookies = req.headers['cookie'].split(";");
    
            for (let i=0; i<cookies.length; i++) {
              const cookieName = cookies[i].split("=")[0].replace(/\s/g,'');
              if (cookieName=="proxytoken") {
                console.log("Found proxy token");
                reqToken = cookies[i].split("=")[1];
                break;
              } 
            }
            if (reqToken) {
              console.log("Token in cookie: "+reqToken);
              console.log("Proxying the request");
      
              proxy.web(req, res, { target: target.url });

              res.setHeader('Set-Cookie','proxytoken='+reqToken);
            } else {
              console.log("Token not found!");
              res.writeHead(401, { 'Content-Type': 'text/plain' });
              res.write('Unauhorized');
              res.end();    
            }
          } else {
            console.log("Token not found!");
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.write('Unauhorized');
            res.end();
          }
        } else {
          console.log("Token not found!");
          res.writeHead(401, { 'Content-Type': 'text/plain' });
          res.write('Unauhorized');
          res.end();
        }
      });
      pserver.listen(serverPort);
      pserver.keepAliveTimeout = 120000;
      console.log("Created server on port "+serverPort);
      
      // reserve port
      const idxpp = pserverPortPool.findIndex(item => item.port===serverPort);
      pserverPortPool[idxpp].available = false;
      console.log(pserverPortPool);

      timeoutId = setTimeout( (ac) => {
        console.log("Web proxy session timeout expired, closing the server with port "+serverPort);
        idx = ac.findIndex(item => item.key === serverPort);
        console.log(ac[idx]);
        ac[idx].server.closeAllConnections();
        ac[idx].server.close();
        
        // free port
        const idx2 = pserverPortPool.findIndex(item =>item.port===serverPort);
        pserverPortPool[idx2].available = true;

        // remove session
        ac.splice(idx, 1);
        console.log(pserverPortPool);
        console.log(activeProxyConnections);
      }, 120000,activeProxyConnections);

      console.log('Web resource, url ='+exp.elements[i].url);
      
      // generate proxy token and register token to the resource
      proxyToken = generateProxyToken(16);
      console.log('Generated proxy token for resource: '+proxyToken);

      activeProxyConnections.push({key: serverPort, id: i, url: exp.elements[i].url, path: exp.elements[i].path, token:proxyToken, server: pserver, tid:timeoutId});

      valueList[i] = {
        proxyToken,
        serverPort
      }
    }
  }
  console.log(valueList)
  return {
    valueList
  };
    
}

async function stopExperiment(experimentId) {

  console.log('stopExperiment, id='+experimentId.id);
  const exp = experiments.find(el => el.id === experimentId.id);
  for (let i = 0; i<exp.elements.length; i++) {
    if (exp.elements[i].resource == "web") {
      const idx = activeProxyConnections.findIndex(item => item.id === i);
      console.log("has web resources, must stop proxy server with port "+activeProxyConnections[idx].key)
      
      activeProxyConnections[idx].server.closeAllConnections();
      activeProxyConnections[idx].server.close();

      // clear wachdog timer
      clearTimeout(activeProxyConnections[idx].tid);

      // free port
      const idx2 = pserverPortPool.findIndex(item =>item.port===activeProxyConnections[idx].key);
      pserverPortPool[idx2].available = true;

      activeProxyConnections.splice(idx, 1);
      console.log(pserverPortPool);
      console.log(activeProxyConnections);
    }
  }

}