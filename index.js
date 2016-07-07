var gcloud = require('gcloud');
var crypto = require( 'crypto' );
var fs = require('fs')

function getFilename( req, file, cb ) {

	crypto.pseudoRandomBytes( 16, function ( err, raw ) {
		cb( err, err ? undefined : raw.toString( 'hex' ) );
	});

}

function getDestination( req, file, cb ) {
	cb( null, '' );
}

function GCStorage (opts) {
  	this.getFilename = ( opts.filename || getFilename );

	if ( 'string' === typeof opts.destination ) {
		this.getDestination = function( $0, $1, cb ) { cb( null, opts.destination ); }
	} else {
		this.getDestination = ( opts.destination || getDestination );
	}

	opts.bucket = ( opts.bucket || process.env.GCS_BUCKET || null );
	opts.projectId = opts.projectId || process.env.GCS_PROJECTID || null;
	opts.keyFilename = opts.keyFilename || process.env.GCS_KEYFILE || null;

	if ( ! opts.bucket ) {
		throw new Error( 'You have to specify bucket for Google Cloud Storage to work.' );
	}

	this.gcobj = gcloud.storage({
		projectId: opts.projectId,
		keyFilename: opts.keyFilename
	});

	this.gcsUpload = this.gcobj.bucket(opts.bucket);

	this.options = opts;
}

GCStorage.prototype._handleFile = function (req, file, cb) {
	var self = this;
	self.getDestination( req, file, function( err, destination ) {

		if ( err ) {
			return cb( err );
		}

		self.getFilename( req, file, function( err, filename ) {
			if ( err ) {
				return cb( err );
			}
		});

	});
}

GCStorage.prototype._removeFile = function _removeFile( req, file, cb ) {
	console.log("delete");
};

module.exports = function( opts ) {
	return new GCStorage( opts );
};
