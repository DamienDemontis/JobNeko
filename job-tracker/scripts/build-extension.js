const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function buildExtension() {
  const extensionPath = path.join(__dirname, '..', 'chrome-extension');
  const publicPath = path.join(__dirname, '..', 'public');
  const outputPath = path.join(publicPath, 'chrome-extension.zip');

  // Create a file to stream archive data to
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
  });

  // Listen for all archive data to be written
  output.on('close', () => {
    console.log(`Chrome extension packaged: ${archive.pointer()} total bytes`);
    console.log('Extension zip created at: public/chrome-extension.zip');
  });

  // Good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('Warning:', err);
    } else {
      throw err;
    }
  });

  // Good practice to catch this error explicitly
  archive.on('error', (err) => {
    throw err;
  });

  // Pipe archive data to the file
  archive.pipe(output);

  // Append files from chrome-extension directory
  archive.directory(extensionPath, false);

  // Finalize the archive (ie we are done appending files but streams have to finish yet)
  await archive.finalize();
}

buildExtension().catch(console.error);