import FormData from 'form-data';
import Fastify from 'fastify';
import fetch from 'node-fetch';
import path from 'path';
import tap from 'tap';
import url from 'url';
import fs from 'fs';

import Server from '../lib/main.js';
import Sink from '../node_modules/@eik/core/lib/sinks/test.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const FIXTURE_MAP = path.resolve(__dirname, '../fixtures/import-map.json');
const FIXTURE_MAP_B = path.resolve(__dirname, '../fixtures/import-map-b.json');

tap.beforeEach(async (t) => {
    const sink = new Sink();
    const service = new Server({ customSink: sink });

    const app = Fastify({
        ignoreTrailingSlash: true,
    });
    app.register(service.api());

    const address = await app.listen(0, 'localhost');

    const formData = new FormData();
    formData.append('key', 'change_me');

    const res = await fetch(`${address}/auth/login`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
    });

    const { token } = await res.json();
    const headers = { 'Authorization': `Bearer ${token}` };

    t.context = { // eslint-disable-line no-param-reassign
        address,
        headers,
        app,
    };
});

tap.afterEach(async (t) => {
    await t.context.app.close();
});

tap.test('alias map - no auth token on PUT - scoped', async (t) => {
    const { address } = t.context;

    // PUT alias on server
    const aliasFormData = new FormData();
    aliasFormData.append('version', '8.4.1');

    const alias = await fetch(`${address}/map/@cuz/fuzz/v8`, {
        method: 'PUT',
        body: aliasFormData,
        headers: aliasFormData.getHeaders(),
    });

    t.equal(alias.status, 401, 'on PUT of alias, server should respond with a 401 Unauthorized');
});

tap.test('alias map - no auth token on PUT - non scoped', async (t) => {
    const { address } = t.context;

    // PUT alias on server
    const aliasFormData = new FormData();
    aliasFormData.append('version', '8.4.1');

    const alias = await fetch(`${address}/map/fuzz/v8`, {
        method: 'PUT',
        body: aliasFormData,
        headers: aliasFormData.getHeaders(),
    });

    t.equal(alias.status, 401, 'on PUT of alias, server should respond with a 401 Unauthorized');
});

tap.test('alias map - no auth token on POST - scoped', async (t) => {
    const { address } = t.context;

    // POST alias on server
    const aliasFormData = new FormData();
    aliasFormData.append('version', '8.4.1');

    const alias = await fetch(`${address}/map/@cuz/fuzz/v8`, {
        method: 'POST',
        body: aliasFormData,
        headers: aliasFormData.getHeaders(),
    });

    t.equal(alias.status, 401, 'on POST of alias, server should respond with a 401 Unauthorized');
});

tap.test('alias map - no auth token on POST - non scoped', async (t) => {
    const { address } = t.context;

    // PUT alias on server
    const aliasFormData = new FormData();
    aliasFormData.append('version', '8.4.1');

    const alias = await fetch(`${address}/map/fuzz/v8`, {
        method: 'POST',
        body: aliasFormData,
        headers: aliasFormData.getHeaders(),
    });

    t.equal(alias.status, 401, 'on POST of alias, server should respond with a 401 Unauthorized');
});

tap.test('alias map - no auth token on DELETE - scoped', async (t) => {
    const { address } = t.context;

    // DELETE alias on server

    const alias = await fetch(`${address}/map/@cuz/fuzz/v8`, {
        method: 'DELETE',
    });

    t.equal(alias.status, 401, 'on POST of alias, server should respond with a 401 Unauthorized');
});

tap.test('alias map - no auth token on POST - non scoped', async (t) => {
    const { address } = t.context;

    // PUT alias on server

    const alias = await fetch(`${address}/map/fuzz/v8`, {
        method: 'DELETE',
    });

    t.equal(alias.status, 401, 'on POST of alias, server should respond with a 401 Unauthorized');
});

tap.test('alias map - put alias, then get map through alias - scoped', async (t) => {
    const { headers, address } = t.context;

    // PUT map on server
    const pkgFormData = new FormData();
    pkgFormData.append('map', fs.createReadStream(FIXTURE_MAP));

    const uploaded = await fetch(`${address}/map/@cuz/fuzz/8.4.1`, {
        method: 'PUT',
        body: pkgFormData,
        headers: { ...headers, ...pkgFormData.getHeaders()},
        redirect: 'manual',
    });

    t.equal(uploaded.status, 303, 'on PUT of map, server should respond with a 303 redirect');
    t.equal(uploaded.headers.get('location'), `${address}/map/@cuz/fuzz/8.4.1`, 'on PUT of map, server should respond with a location header');

    // PUT alias on server
    const aliasFormData = new FormData();
    aliasFormData.append('version', '8.4.1');

    const alias = await fetch(`${address}/map/@cuz/fuzz/v8`, {
        method: 'PUT',
        body: aliasFormData,
        headers: { ...headers, ...aliasFormData.getHeaders()},
        redirect: 'manual',
    });

    t.equal(alias.status, 303, 'on PUT of alias, server should respond with a 303 redirect');
    t.equal(alias.headers.get('location'), `${address}/map/@cuz/fuzz/v8`, 'on PUT of alias, server should respond with a location header');

    // GET map through alias from server
    const redirect = await fetch(alias.headers.get('location'), {
        method: 'GET',
        redirect: 'manual',
    });

    t.equal(redirect.status, 302, 'on GET of map through alias, server should respond with a 302 redirect');
    t.equal(redirect.headers.get('location'), `${address}/map/@cuz/fuzz/8.4.1`, 'on GET of map through alias, server should respond with a location header');

    // GET map from server
    const downloaded = await fetch(redirect.headers.get('location'), {
        method: 'GET',
    });

    const downloadedResponse = await downloaded.json();

    t.equal(downloaded.status, 200, 'on GET of map, server should respond with 200 ok');
    t.matchSnapshot(downloadedResponse, 'on GET of file, response should match snapshot');
});

tap.test('alias map - put alias, then get map through alias - non scoped', async (t) => {
    const { headers, address } = t.context;

    // PUT map on server
    const pkgFormData = new FormData();
    pkgFormData.append('map', fs.createReadStream(FIXTURE_MAP));

    const uploaded = await fetch(`${address}/map/fuzz/8.4.1`, {
        method: 'PUT',
        body: pkgFormData,
        headers: { ...headers, ...pkgFormData.getHeaders()},
        redirect: 'manual',
    });

    t.equal(uploaded.status, 303, 'on PUT of map, server should respond with a 303 redirect');
    t.equal(uploaded.headers.get('location'), `${address}/map/fuzz/8.4.1`, 'on PUT of map, server should respond with a location header');

    // PUT alias on server
    const aliasFormData = new FormData();
    aliasFormData.append('version', '8.4.1');

    const alias = await fetch(`${address}/map/fuzz/v8`, {
        method: 'PUT',
        body: aliasFormData,
        headers: { ...headers, ...aliasFormData.getHeaders()},
        redirect: 'manual',
    });

    t.equal(alias.status, 303, 'on PUT of alias, server should respond with a 303 redirect');
    t.equal(alias.headers.get('location'), `${address}/map/fuzz/v8`, 'on PUT of alias, server should respond with a location header');

    // GET file through alias from server
    const redirect = await fetch(alias.headers.get('location'), {
        method: 'GET',
        redirect: 'manual',
    });

    t.equal(redirect.status, 302, 'on GET of map through alias, server should respond with a 302 redirect');
    t.equal(redirect.headers.get('location'), `${address}/map/fuzz/8.4.1`, 'on GET of map through alias, server should respond with a location header');

    // GET file from server
    const downloaded = await fetch(redirect.headers.get('location'), {
        method: 'GET',
    });

    const downloadedResponse = await downloaded.json();

    t.equal(downloaded.status, 200, 'on GET of map, server should respond with 200 ok');
    t.matchSnapshot(downloadedResponse, 'on GET of file, response should match snapshot');
});

tap.test('alias map - put alias, then update alias, then get map through alias - scoped', async (t) => {
    const { headers, address } = t.context;

    // PUT maps on server
    const pkgFormDataA = new FormData();
    pkgFormDataA.append('map', fs.createReadStream(FIXTURE_MAP));
    await fetch(`${address}/map/@cuz/fuzz/8.4.1`, {
        method: 'PUT',
        body: pkgFormDataA,
        headers: { ...headers, ...pkgFormDataA.getHeaders()},
        redirect: 'manual',
    });

    const pkgFormDataB = new FormData();
    pkgFormDataB.append('map', fs.createReadStream(FIXTURE_MAP_B));
    await fetch(`${address}/map/@cuz/fuzz/8.8.9`, {
        method: 'PUT',
        body: pkgFormDataB,
        headers: { ...headers, ...pkgFormDataB.getHeaders()},
        redirect: 'manual',
    });

    // PUT alias on server
    const aliasFormDataA = new FormData();
    aliasFormDataA.append('version', '8.4.1');

    const aliasA = await fetch(`${address}/map/@cuz/fuzz/v8`, {
        method: 'PUT',
        body: aliasFormDataA,
        headers: { ...headers, ...aliasFormDataA.getHeaders()},
    });

    const aliasResponseA = await aliasA.json();

    t.equal(aliasResponseA.imports.fuzz, 'http://localhost:4001/finn/pkg/fuzz/v8', 'on PUT of alias, alias should redirect to set "version"');

    // POST alias on server
    const aliasFormDataB = new FormData();
    aliasFormDataB.append('version', '8.8.9');

    const aliasB = await fetch(`${address}/map/@cuz/fuzz/v8`, {
        method: 'POST',
        body: aliasFormDataB,
        headers: { ...headers, ...aliasFormDataB.getHeaders()},
    });

    const aliasResponseB = await aliasB.json();

    t.equal(aliasResponseB.imports.fuzz, 'http://localhost:4001/finn/pkg/fuzz/v9', 'on POST of alias, alias should redirect to set "version"');
});

tap.test('alias map - put alias, then update alias, then get map through alias - non scoped', async (t) => {
    const { headers, address } = t.context;

    // PUT maps on server
    const pkgFormDataA = new FormData();
    pkgFormDataA.append('map', fs.createReadStream(FIXTURE_MAP));
    await fetch(`${address}/map/fuzz/8.4.1`, {
        method: 'PUT',
        body: pkgFormDataA,
        headers: { ...headers, ...pkgFormDataA.getHeaders()},
        redirect: 'manual',
    });

    const pkgFormDataB = new FormData();
    pkgFormDataB.append('map', fs.createReadStream(FIXTURE_MAP_B));
    await fetch(`${address}/map/fuzz/8.8.9`, {
        method: 'PUT',
        body: pkgFormDataB,
        headers: { ...headers, ...pkgFormDataB.getHeaders()},
        redirect: 'manual',
    });

    // PUT alias on server
    const aliasFormDataA = new FormData();
    aliasFormDataA.append('version', '8.4.1');

    const aliasA = await fetch(`${address}/map/fuzz/v8`, {
        method: 'PUT',
        body: aliasFormDataA,
        headers: { ...headers, ...aliasFormDataA.getHeaders()},
    });

    const aliasResponseA = await aliasA.json();

    t.equal(aliasResponseA.imports.fuzz, 'http://localhost:4001/finn/pkg/fuzz/v8', 'on PUT of alias, alias should redirect to set "version"');

    // POST alias on server
    const aliasFormDataB = new FormData();
    aliasFormDataB.append('version', '8.8.9');

    const aliasB = await fetch(`${address}/map/fuzz/v8`, {
        method: 'POST',
        body: aliasFormDataB,
        headers: { ...headers, ...aliasFormDataB.getHeaders()},
    });

    const aliasResponseB = await aliasB.json();

    t.equal(aliasResponseB.imports.fuzz, 'http://localhost:4001/finn/pkg/fuzz/v9', 'on POST of alias, alias should redirect to set "version"');
});

tap.test('alias map - put alias, then delete alias, then get map through alias - scoped', async (t) => {
    const { headers, address } = t.context;

    // PUT map on server
    const pkgFormData = new FormData();
    pkgFormData.append('map', fs.createReadStream(FIXTURE_MAP));

    const uploaded = await fetch(`${address}/map/@cuz/fuzz/8.4.1`, {
        method: 'PUT',
        body: pkgFormData,
        headers: { ...headers, ...pkgFormData.getHeaders()},
        redirect: 'manual',
    });

    t.equal(uploaded.status, 303, 'on PUT of map, server should respond with a 303 redirect');
    t.equal(uploaded.headers.get('location'), `${address}/map/@cuz/fuzz/8.4.1`, 'on PUT of map, server should respond with a location header');

    // PUT alias on server
    const aliasFormData = new FormData();
    aliasFormData.append('version', '8.4.1');

    const alias = await fetch(`${address}/map/@cuz/fuzz/v8`, {
        method: 'PUT',
        body: aliasFormData,
        headers: { ...headers, ...aliasFormData.getHeaders()},
    });

    const aliasResponse = await alias.json();

    t.equal(aliasResponse.imports.fuzz, 'http://localhost:4001/finn/pkg/fuzz/v8', 'on PUT of alias, alias should redirect to set "version"');

    // DELETE alias on server
    const deleted = await fetch(`${address}/map/@cuz/fuzz/v8`, {
        method: 'DELETE',
        headers,
    });

    t.equal(deleted.status, 204, 'on DELETE of alias, server should respond with a 204 Deleted');

    // GET map through alias from server
    const errored = await fetch(`${address}/map/@cuz/fuzz/v8`, {
        method: 'GET',
        redirect: 'manual',
    });

    t.equal(errored.status, 404, 'on GET of map through deleted alias, server should respond with a 404 Not Found');
});

tap.test('alias map - put alias, then delete alias, then get map through alias - non scoped', async (t) => {
    const { headers, address } = t.context;

    // PUT map on server
    const pkgFormData = new FormData();
    pkgFormData.append('map', fs.createReadStream(FIXTURE_MAP));

    const uploaded = await fetch(`${address}/map/fuzz/8.4.1`, {
        method: 'PUT',
        body: pkgFormData,
        headers: { ...headers, ...pkgFormData.getHeaders()},
        redirect: 'manual',
    });

    t.equal(uploaded.status, 303, 'on PUT of map, server should respond with a 303 redirect');
    t.equal(uploaded.headers.get('location'), `${address}/map/fuzz/8.4.1`, 'on PUT of map, server should respond with a location header');

    // PUT alias on server
    const aliasFormData = new FormData();
    aliasFormData.append('version', '8.4.1');

    const alias = await fetch(`${address}/map/fuzz/v8`, {
        method: 'PUT',
        body: aliasFormData,
        headers: { ...headers, ...aliasFormData.getHeaders()},
    });

    const aliasResponse = await alias.json();

    t.equal(aliasResponse.imports.fuzz, 'http://localhost:4001/finn/pkg/fuzz/v8', 'on PUT of alias, alias should redirect to set "version"');

    // DELETE alias on server
    const deleted = await fetch(`${address}/map/fuzz/v8`, {
        method: 'DELETE',
        headers,
    });

    t.equal(deleted.status, 204, 'on DELETE of alias, server should respond with a 204 Deleted');

    // GET map through alias from server
    const errored = await fetch(`${address}/map/fuzz/v8`, {
        method: 'GET',
        redirect: 'manual',
    });

    t.equal(errored.status, 404, 'on GET of map through deleted alias, server should respond with a 404 Not Found');
});
