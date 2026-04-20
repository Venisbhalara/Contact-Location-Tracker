const https = require("https");
const http = require("http");

/**
 * getPublicIp
 * Discovers the server's own public IP by querying ip-api.com with no arg.
 * Used as a fallback in local development where the backend only sees
 * private/LAN IPs (127.x, 192.168.x, etc.) due to the Vite proxy.
 */
function getPublicIp() {
  return new Promise((resolve) => {
    const req = http.get("http://ip-api.com/json/?fields=query", { timeout: 4000 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.query || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

/**
 * getLocationFromIp
 * Queries ip-api.com to convert an IP address to approximate lat/lng + metadata.
 * Free tier: 45 requests/minute. No API key required.
 *
 * Dev-mode note: When the IP is private (local development), this function
 * automatically discovers the machine's real public IP and geocodes that instead.
 *
 * @param {string} ip - The public IP address to look up
 */
async function getLocationFromIp(ip) {
  const privateRanges = [
    /^127\./,
    /^localhost$/,
    /^::1$/,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^::ffff:127\./,
    /^::ffff:192\.168\./,
    /^::ffff:10\./,
  ];

  const isPrivate = privateRanges.some((r) => r.test(ip));

  if (isPrivate) {
    if (process.env.NODE_ENV === "production") {
      // In production a private IP means something is misconfigured — fail fast
      console.warn(`[ipGeocode] Private IP in production context: ${ip}`);
      return { success: false, error: "private_ip", message: "Private IP in production" };
    }

    // Development: discover and use the machine's real public IP instead
    console.warn(`[ipGeocode] Private IP detected (${ip}) in dev — auto-discovering public IP...`);
    const publicIp = await getPublicIp();
    if (!publicIp) {
      return { success: false, error: "private_ip", message: "Could not discover public IP" };
    }
    console.log(`[ipGeocode] Using discovered public IP: ${publicIp}`);
    ip = publicIp; // swap to public IP for geocoding
  }

  const fields = "status,message,country,countryCode,regionName,city,zip,lat,lon,isp,org,query";
  // Use HTTP (ip-api.com only supports HTTPS on paid plans)
  const url = `http://ip-api.com/json/${ip}?fields=${fields}`;

  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === "success") {
            resolve({
              success: true,
              lat: parsed.lat,
              lon: parsed.lon,
              city: parsed.city || null,
              region: parsed.regionName || null,
              country: parsed.countryCode || parsed.country || null,
              zip: parsed.zip || null,
              isp: parsed.isp || null,
              org: parsed.org || null,
              query: parsed.query,
            });
          } else {
            resolve({
              success: false,
              error: parsed.message || "ip-api query failed",
            });
          }
        } catch (e) {
          resolve({ success: false, error: "parse_error", message: e.message });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ success: false, error: "network_error", message: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ success: false, error: "timeout" });
    });
  });
}

module.exports = { getLocationFromIp };
