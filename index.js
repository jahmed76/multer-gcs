let gcloud = require('google-cloud');
let crypto = require( 'crypto' );
let peek = require('buffer-peek-stream')
let fileTypeCheck = require('file-type')

function getFilename( req, file, cb ) {
	crypto.pseudoRandomBytes( 16, function ( err, raw ) {
		cb( err, err ? undefined : raw.toString( 'hex' ));
	});
}

function getDestination( req, file, cb ) {
	cb( null, '' );
}

function preProcess(req, file, cb){
	cb(null, '')
}

function GCStorage (opts) {
	this.getFilename = ( opts.filename || getFilename );

	if ( 'string' === typeof opts.destination ) {
		this.getDestination = function( $0, $1, cb ) { cb( null, opts.destination ); }
	} else {
		this.getDestination = ( opts.destination || getDestination );
	}

	this.preProcess = (opts.preProcess || preProcess)

	opts.bucket = ( opts.bucket || process.env.GCS_BUCKET || null );
	opts.projectId = opts.projectId || process.env.GCLOUD_PROJECT || null;
	opts.keyFilename = opts.keyFilename || process.env.GCS_KEYFILE || null;

	if ( ! opts.bucket ) {
		throw new Error( 'You have to specify bucket for Google Cloud Storage to work.' );
	}

	if ( ! opts.projectId ) {
		throw new Error( 'You have to specify project id for Google Cloud Storage to work.' );
	}

	if ( ! opts.keyFilename ) {
		throw new Error( 'You have to specify credentials key file for Google Cloud Storage to work.' );
	}

	this.gcobj = gcloud.storage({
		projectId: opts.projectId,
		keyFilename: opts.keyFilename
	});

	this.gcsBucket = this.gcobj.bucket(opts.bucket);
	this.options = opts;
}

GCStorage.prototype._handleFile = function (req, file, cb) {
	let self = this;

  self._getMimetype(req, file)
	.then(function(){

			self.preProcess(req, file, function (err) {

			if (err) {
				return cb(err)
			}

			self.getDestination(req, file, function (err, destination) {
				if (err) {
					return cb(err);
				}

				self.getFilename(req, file, function (err, filename) {
					filename += file.extension ? `.${file.extension}` : ''
					if (err) {
						return cb(err);
					}
					let gcFile = self.gcsBucket.file(filename);
					cwsOpts = {
						predefinedAcl: self.options.acl || 'private',
						metadata: {
							contentType: file.mimetype
						}
					}

					file.outStream.pipe(gcFile.createWriteStream(cwsOpts)).
						on('error', function (err) {
							return cb(err);
						}).
						on('finish', function (file) {
							return cb(null, {
								path: 'https://' + self.options.bucket +
								'.storage.googleapis.com/' + filename,
								filename: filename
							});
						});

				});

			});
		});
	}).catch(function(err){
		return cb(err)
	})
}

GCStorage.prototype._removeFile = function _removeFile( req, file, cb ) {
	let gcFile = self.gcsBucket.file(file.filename);
	gcFile.delete(cb);
};

GCStorage.prototype._getMimetype = function _getMimetype(req, file){
  return new Promise(function(resolve, reject){
    peek(file.stream, 4100, function(err, data, outStream){
      let inspectData = fileTypeCheck(data)

      if (inspectData) {
        file.originalMimetype = file.mimetype
        file.extension = inspectData.ext
        file.mimetype = inspectData.mime
        file.outStream = outStream
      }

      if (err){
        reject(err)
      } else {
        resolve(true)
      }

    })
  })
}

module.exports = function( opts ) {
  return new GCStorage( opts );
};