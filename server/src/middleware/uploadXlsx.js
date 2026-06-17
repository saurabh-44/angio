import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

// In-memory storage for Excel uploads. Files are small (a few KB to
// hundreds of KB at most for a 1000-row import) so we skip disk IO and
// parse straight from the buffer.
//
// Cap at 2 MB — far more than any reasonable import we'd accept. A
// stricter limit also helps thwart casual abuse if someone tries to
// upload a 50 MB .xlsm full of macros.
const MAX_SIZE = 2 * 1024 * 1024;

const XLSX_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls (legacy, xlsx-js can still read)
  'application/octet-stream', // some browsers send this for unrecognised types
]);

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter(_req, file, cb) {
    const okExt = /\.(xlsx|xls)$/i.test(file.originalname);
    const okMime = XLSX_MIME.has(file.mimetype);
    if (!okExt && !okMime) {
      return cb(new HttpError(400, 'BAD_REQUEST', 'Only .xlsx files are accepted'));
    }
    cb(null, true);
  },
}).single('file');

// Wrap multer's callback-style middleware so multer-level errors flow
// through our errorHandler the same way as everything else.
export function uploadXlsxMiddleware(req, res, next) {
  uploader(req, res, (err) => {
    if (!err) return next();
    if (err instanceof HttpError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(400, 'FILE_TOO_LARGE', 'File exceeds 2 MB limit'));
    }
    next(new HttpError(400, 'BAD_UPLOAD', err.message ?? 'Upload failed'));
  });
}
