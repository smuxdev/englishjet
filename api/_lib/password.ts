import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt de node:crypto: sin deps nativas de terceros (bcrypt & cía. dan
// problemas en serverless). Parámetros embebidos en el hash para poder
// subirlos sin invalidar contraseñas existentes.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

function scryptAsync(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LEN, { N, r, p }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `scrypt$N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, params, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !params || !saltB64 || !hashB64) return false;
  const m = /^N=(\d+),r=(\d+),p=(\d+)$/.exec(params);
  if (!m) return false;
  const key = await scryptAsync(password, Buffer.from(saltB64, "base64"), Number(m[1]), Number(m[2]), Number(m[3]));
  const expected = Buffer.from(hashB64, "base64");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
