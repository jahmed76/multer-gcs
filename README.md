# Multer-Storage-S3
Google Cloud Storage Multer Storage Engine

Multer Storage Engine that uses Google Cloud Storage as a storage system.

Please read official documentation at https://googlecloudplatform.github.io/gcloud-node/#/docs/v0.36.0/storage for additional options

## Installation
	
	npm install multer-gcs

## Usage
```javascript
var multer = require( 'multer' );
var gcs = require( 'multer-gcs' );
var storage = gcs({
	filename    : function( req, file, cb ) {
		
		cb( null, file.fieldname + '-' + Date.now() );
		
	},
	bucket      : 'bucket-name', // Required : bucket name to upload
	projectId      : 'dummy-project', // Required : Google project ID
	keyFilename : '/path/to/keyfile.json', // Required : JSON credentials file for Google Cloud Storage
	acl : 'publicRead' // Optional : Defaults to projectPrivate. See options in the link below:
	//https://cloud.google.com/storage/docs/access-control/lists
});

var gcsUpload = multer({ storage: storage });

app.post( '/upload', gcsUpload.single( 'file' ), function( req, res, next ) {

	res.send( 'File was uploaded successfully!' );

});
```
You can also use environment variables for multer-gcs parameters.
```
GCS_BUCKET='bucket-name'
GCLOUD_PROJECT='dummy-project'
GCS_KEYFILE='/path/to/keyfile.json'
```
## License

[MIT](LICENSE)
=======
