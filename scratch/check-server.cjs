const http = require('http');

http.get('http://localhost:3000', (res) => {
  console.log('HTTP Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response length:', data.length);
    console.log('Contains title:', data.includes('ReApparel'));
    console.log('OK! Dev server is running smoothly on port 3000.');
  });
}).on('error', (err) => {
  console.error('Connection error:', err.message);
});
