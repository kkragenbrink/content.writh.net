'use strict';

const Bluebird = require('bluebird');

const fs = Bluebird.promisifyAll(require('fs'));
const http = require('http');
const pull = Bluebird.promisify(require('git-pull'));
const url = require('url');

const PATH = '/var/www/content.writh.net';
const DIRPERMS = '755';
const FILEPERMS = '644';
const PORT = 3000;

process.on('uncaughtException', (e) => console.error(e));

async function fixPermissions (path) {
    if (path.split('/').includes('node_modules')) return;

    const stat = await fs.statAsync(path);
    
    if (stat.isFile()) {
        return await fs.chmodAsync(path, FILEPERMS);
    }

    await fs.chmodAsync(path, DIRPERMS);
    const files = fs.readdirAsync(path);
    return await Bluebird.all(files.map(async (file) => await fixPermissions(`${path}/${file}`)));
}

async function update (req, res) {
    await pull(PATH);
    await fixPermissions(PATH);

    res.statusCode = 200;
    res.write('ok');
}

async function service (req, res) {
    req.pathinfo = url.parse(req.url);
    const info = `[${req.connection.remoteAddress}] ${req.method} ${req.pathinfo.pathname}`;
    console.log(`--> ${info}`);

    try {
        const handler = routes[`${req.method.toUpperCase()} ${req.pathinfo.pathname}`];
        if (typeof handler === 'function') await handler(req, res);
        else res.statusCode = 500;

    }
    catch (e) {
        console.error(e);
        res.statusCode = 500;
    }
    
    res.end();
    console.log(`<-- ${res.statusCode} ${info}`);
}

const routes = {
    'GET /pull' : update,
    'POST /pull' : update
};

const server = http.createServer(service);
server.listen(PORT);

