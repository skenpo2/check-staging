import { Request } from 'express';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';

export interface LoginMetadata {
  ipAddress: string;
  device: string;
  location: string;
  loginTime: string;
  rawDeviceInfo: ReturnType<UAParser['getResult']>;
}

export const getLoginMetadata = (req: Request): LoginMetadata => {
  const userAgent = req.headers['user-agent'] || 'Unknown Agent';
  const parser = new UAParser(userAgent);
  const uaResult = parser.getResult();

  const rawIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '';
  const ip = rawIp.includes('::ffff:') ? rawIp.split('::ffff:')[1] : rawIp;

  const isLocalhost = ip === '127.0.0.1' || ip === '::1';

  const geo = isLocalhost ? null : geoip.lookup(ip);
  const location = geo
    ? `${geo.city || 'Unknown City'}, ${geo.region || 'Unknown Region'}, ${
        geo.country || 'Unknown Country'
      }`
    : 'Unknown Location';

  const browserName = uaResult.browser.name || 'Unknown Browser';
  const osName = uaResult.os.name || 'Unknown OS';

  const device =
    uaResult.device.model || `${browserName} on ${osName}` || 'Unknown device';

  return {
    ipAddress: ip,
    device,
    location,
    loginTime: new Date().toISOString(),
    rawDeviceInfo: uaResult,
  };
};
