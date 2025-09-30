const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

// Generate a key pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

// Set certificate attributes
const attrs = [{
    name: 'commonName',
    value: 'localhost'
}, {
    name: 'organizationName',
    value: 'Mental Chessters Dev'
}, {
    name: 'organizationalUnitName',
    value: 'Development'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
}, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
}, {
    name: 'subjectAltName',
    altNames: [{
        type: 2, // DNS
        value: 'localhost'
    }, {
        type: 7, // IP
        ip: '127.0.0.1'
    }]
}]);

// Sign the certificate
cert.sign(keys.privateKey);

// Convert to PEM format
const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

// Save to files
fs.writeFileSync('server.cert', certPem);
fs.writeFileSync('server.key', keyPem);

console.log('✅ SSL certificate generated successfully!');
console.log('📁 Files created: server.cert, server.key');
console.log('⚠️  Remember to trust this certificate in your browser');