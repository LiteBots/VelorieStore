// Generuje losowe sekrety do wklejenia w Railway → Variables.
import { randomBytes } from 'node:crypto';

const b64 = (n) => randomBytes(n).toString('base64url');
console.log(`NEXTAUTH_SECRET=${b64(48)}`);
console.log(`LICENSE_PEPPER=${b64(48)}`);
console.log(`ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`);
console.log(`LICENSE_SIGNING_SECRET=${b64(48)}`);
