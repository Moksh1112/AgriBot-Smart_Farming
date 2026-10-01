const dns = require('dns');
const mongoose = require('mongoose');

const FALLBACK_DNS = ['1.1.1.1', '8.8.8.8', '2001:4860:4860::8888'];

// mongodb+srv:// needs an SRV lookup through Node's own resolver. On some
// networks (e.g. IPv6-only phone hotspots) the system DNS server is a scoped
// link-local address Node cannot use, leaving only 127.0.0.1 and failing with
// "querySrv ECONNREFUSED". DNS_SERVERS overrides; otherwise fall back to public DNS.
function configureDns() {
  const configured = (process.env.DNS_SERVERS || '').split(',').map((server) => server.trim()).filter(Boolean);
  if (configured.length) {
    dns.setServers(configured);
    return;
  }
  const servers = dns.getServers();
  const onlyLoopback = servers.every((server) => server === '127.0.0.1' || server === '::1');
  if (onlyLoopback) {
    dns.setServers(FALLBACK_DNS);
    console.log('System DNS is not usable by Node; using public DNS for MongoDB lookups.');
  }
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured in the environment.');
  }

  if (mongoUri.startsWith('mongodb+srv://')) configureDns();
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected successfully.');
}

module.exports = connectDatabase;
