/**
 * Offline auth unit checks (no DB required):
 * - password hashing/verify
 * - register/login schema validation
 * - token sign/verify
 *
 * Run: npm run test:auth
 */
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, hashToken, createRawToken } from '../utils/crypto';
import { signAccessToken, verifyAccessToken } from '../utils/tokens';
import { loginSchema, registerSchema } from '../validators/authValidators';

async function main() {
  const password = 'SecurePass1';
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);

  const parsed = registerSchema.parse({
    firstName: 'Ama',
    lastName: 'Mensah',
    email: 'ama@example.com',
    phone: '+233241112233',
    password,
    confirmPassword: password,
    termsAccepted: true,
  });
  assert.equal(parsed.email, 'ama@example.com');

  assert.throws(() =>
    registerSchema.parse({
      ...parsed,
      confirmPassword: 'mismatch1',
      termsAccepted: true,
    })
  );

  const login = loginSchema.parse({ identifier: 'ama@example.com', password });
  assert.equal(login.identifier, 'ama@example.com');

  const token = signAccessToken('user_123', 'user');
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, 'user_123');
  assert.equal(payload.role, 'user');

  const raw = createRawToken();
  assert.notEqual(hashToken(raw), raw);

  console.info('authSmokeTest: all checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
