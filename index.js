var gcloud = require('gcloud');
var crypto = require( 'crypto' );
var fs = require('fs');
var mime = require('mime-types');
var path = require('path');

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
	var self = this;
	self.getDestination( req, file, function( err, destination ) {

		if ( err ) {
			return cb( err );
		}
		
		
		self.getFilename( req, file, function( err, filename ) {
			if ( err ) {
				return cb( err );
			}
			
			//Set options for upload
			var new_options = {
				metadata: {}
			}
			
			//Add predefined ACL
			new_options.predefinedAcl = self.options.acl || 'projectPrivate';
			
			//Set mime type
			var contentType = mime.contentType(path.basename(filename));
			new_options.metadata.contentType = contentType;
			
			var gcFile = self.gcsBucket.file(filename);
			
			file.stream.pipe(gcFile.createWriteStream(new_options))
			.on('error', function(err) {
				return cb(err);
			})
			.on('finish', function(file) {
			    return cb(null , {
			    	path : 'https://' + self.options.bucket + '.storage.googleapis.com/' + filename ,
			    	filename : filename
			    });
			});
			
		});

	});
}

GCStorage.prototype._removeFile = function _removeFile( req, file, cb ) {
	var gcFile = self.gcsBucket.file(file.filename);
	gcFile.delete(cb);
};

module.exports = function( opts ) {
	return new GCStorage( opts );
};
