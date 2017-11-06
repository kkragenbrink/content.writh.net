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

async function getPull (req, res) {
    await pull(PATH);
    await fixPermissions(PATH);

    res.statusCode = 204;
}

async function service (req, res) {
    req.pathinfo = url.parse(req.url);

    try {
        console.log(`--> ${req.method} ${req.pathinfo.pathname}`);
        const handler = routes[`${req.method.toUpperCase()} ${req.pathinfo.pathname}`];
        await handler(req, res);
        console.log(`<-- ${res.statusCode}`);
    }
    catch (e) {
        console.error(e);
    }
}

const routes = {
    'GET /pull' : getPull
};

const server = http.createServer(service);
server.listen(PORT);

