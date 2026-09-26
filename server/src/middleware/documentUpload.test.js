import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readFile, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { documentUpload, documentsDir } from './documentUpload.js';

test('multipart documents save to disk, parse objects, validate files and clean up failures', async () => {
  const app = express();
  app.use(express.json());
  let failedFile;
  app.post('/upload', documentUpload, (req, res) => {
    if (req.body.fail) {
      failedFile = req.files.verificationProof[0].path;
      return res.sendStatus(400);
    }
    req.documentsSaved = true;
    res.json(req.body);
  });
  app.use((err, req, res, next) => res.status(400).json({ message: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/upload`;
  const saved = [];
  try {
    const form = new FormData();
    form.append('location', JSON.stringify({ lat: 26, lng: 75 }));
    form.append('shelter', JSON.stringify({ capacityKg: 100, acceptedTypes: ['produce'] }));
    for (const field of ['verificationProof', 'fssaiCert', 'ngoCert', 'driverLicense']) {
      form.append(field, new Blob(['%PDF-1.4\nfixture'], { type: 'application/pdf' }), '../../proof.pdf');
    }
    const response = await fetch(url, { method: 'POST', body: form });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.location, { lat: 26, lng: 75 });
    assert.deepEqual(body.shelter.acceptedTypes, ['produce']);
    for (const field of ['verificationProof', 'fssaiCert', 'ngoCert', 'driverLicense']) {
      assert.match(body[field], /^\/uploads\/documents\/[\da-f-]+\.pdf$/);
      const file = path.join(documentsDir, path.basename(body[field]));
      saved.push(file);
      assert.equal(await readFile(file, 'utf8'), '%PDF-1.4\nfixture');
    }
    assert.equal(new Set(saved).size, 4);

    const invalid = new FormData();
    invalid.append('verificationProof', new Blob(['<script/>'], { type: 'text/html' }), 'proof.html');
    assert.equal((await fetch(url, { method: 'POST', body: invalid })).status, 400);

    const oversized = new FormData();
    oversized.append('verificationProof', new Blob([new Uint8Array(6 * 1024 * 1024 + 1)], { type: 'application/pdf' }), 'large.pdf');
    assert.equal((await fetch(url, { method: 'POST', body: oversized })).status, 400);

    const failed = new FormData();
    failed.append('fail', 'true');
    failed.append('verificationProof', new Blob(['%PDF'], { type: 'application/pdf' }), 'proof.pdf');
    assert.equal((await fetch(url, { method: 'POST', body: failed })).status, 400);
    // Finish-event cleanup is asynchronous.
    for (let attempt = 0; attempt < 20; attempt++) {
      try { await access(failedFile); } catch { break; }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await assert.rejects(access(failedFile), { code: 'ENOENT' });

    const json = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Donor', verificationProof: '/uploads/documents/someone-else.pdf' }) });
    assert.deepEqual(await json.json(), { name: 'Donor' });
  } finally {
    await Promise.all(saved.map((file) => unlink(file)));
    await new Promise((resolve) => server.close(resolve));
  }
});
