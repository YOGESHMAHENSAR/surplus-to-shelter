import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const documentsDir = fileURLToPath(new URL('../../uploads/documents/', import.meta.url));
mkdirSync(documentsDir, { recursive: true });
const extensions = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
export const documentFields = ['fssaiCert', 'ngoCert', 'driverLicense', 'verificationProof'];
const parse = multer({
  storage: multer.diskStorage({
    destination: documentsDir,
    filename: (req, file, cb) => cb(null, `${randomUUID()}${extensions[file.mimetype]}`),
  }),
  limits: { fileSize: 6 * 1024 * 1024, files: 4, fields: 30 },
  fileFilter: (req, file, cb) => {
    if (extensions[file.mimetype]) return cb(null, true);
    cb(Object.assign(new Error('Upload a PDF, JPEG, PNG, WebP or GIF file'), { status: 400 }));
  },
}).fields(documentFields.map((name) => ({ name, maxCount: 1 })));

export const documentUpload = (req, res, next) => {
  parse(req, res, (err) => {
    if (err) return next(err);
    const files = Object.values(req.files || {}).flat();
    const cleanup = () => {
      if (!req.documentsSaved) {
        for (const file of files) unlink(file.path).catch(console.error);
      }
    };
    res.once('finish', cleanup);
    res.once('close', () => { if (!res.writableFinished) cleanup(); });
    try {
      for (const key of ['location', 'shelter']) {
        if (typeof req.body[key] === 'string') {
          try { req.body[key] = JSON.parse(req.body[key]); }
          catch { throw Object.assign(new Error(`${key} must be valid JSON`), { status: 400 }); }
        }
      }
      // Document paths must originate from uploads, not client-supplied paths.
      for (const key of documentFields) {
        if (typeof req.body[key] === 'string' && req.body[key].startsWith('/uploads/')) delete req.body[key];
      }
      for (const file of files) req.body[file.fieldname] = `/uploads/documents/${file.filename}`;
      next();
    } catch (error) { next(error); }
  });
};
