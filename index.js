const gcloud = require('google-cloud');
const crypto = require('crypto');
const peek = require('buffer-peek-stream');
const fileTypeCheck = require('file-type');

function getFilename(req, file, cb) {
  crypto.pseudoRandomBytes(16, (err, raw) => {
    cb(err, err ? undefined : raw.toString('hex'));
  });
}

function getDestination(req, file, cb) {
  cb(null, '');
}

function preProcess(req, file, cb) {
  cb(null, '');
}

function GCStorage(opts) {
  this.getFilename = (opts.filename || getFilename);

  if (typeof opts.destination === 'string') {
    this.getDestination = function ($0, $1, cb) { cb(null, opts.destination); };
  } else {
    this.getDestination = (opts.destination || getDestination);
  }

  this.preProcess = (opts.preProcess || preProcess);

  opts.bucket = (opts.bucket || process.env.GCS_BUCKET || null);
  opts.projectId = opts.projectId || process.env.GCLOUD_PROJECT || null;
  opts.keyFilename = opts.keyFilename || process.env.GCS_KEYFILE || null;

  if (!opts.bucket) {
    throw new Error('You have to specify bucket for Google Cloud Storage to work.');
  }

  if (!opts.projectId) {
    throw new Error('You have to specify project id for Google Cloud Storage to work.');
  }

  if (!opts.keyFilename) {
    throw new Error('You have to specify credentials key file for Google Cloud Storage to work.');
  }

  this.gcobj = gcloud.storage({
    projectId: opts.projectId,
    keyFilename: opts.keyFilename,
  });

  this.gcsBucket = this.gcobj.bucket(opts.bucket);
  this.options = opts;
}

GCStorage.prototype._handleFile = function (req, file, cb) {
  const self = this;

  self.getMimetype(req, file).then((file) => {
    self.preProcess(req, file, (err) => {
      if (err) {
        return cb(err);
      }

      self.getDestination(req, file, (err, destination) => {
        if (err) {
          return cb(err);
        }

        self.getFilename(req, file, (err, filename) => {
          filename += file.extension ? `.${file.extension}` : '';
          if (err) {
            return cb(err);
          }
          const gcFile = self.gcsBucket.file(filename);
          const cwsOpts = {
            predefinedAcl: self.options.acl || 'private',
            metadata: {
              contentType: file.mimetype,
            },
          };

          file.outStream.pipe(gcFile.createWriteStream(cwsOpts))
            .on('error', err => cb(err))
            .on('finish', file => cb(null, {
              path: `https://${self.options.bucket
              }.storage.googleapis.com/${filename}`,
              filename,
            }));
        });
      });
    });
  }).catch(err => cb(err));
};

GCStorage.prototype._removeFile = function _removeFile(req, file, cb) {
  const gcFile = self.gcsBucket.file(file.filename);
  gcFile.delete(cb);
};

GCStorage.prototype.getMimetype = function getMimetype(req, file) {
  const newFile = file;
  return new Promise(((resolve, reject) => {
    peek(file.stream, 4100, (err, data, outStream) => {
      if (err) {
        reject(err);
      } else {
        const inspectData = fileTypeCheck(data);
        if (inspectData) {
          newFile.originalMimetype = file.mimetype;
          newFile.extension = inspectData.ext;
          newFile.mimetype = inspectData.mime;
          newFile.outStream = outStream;
        }
        resolve(newFile);
      }
    });
  }));
};

module.exports = function (opts) {
  return new GCStorage(opts);
};
