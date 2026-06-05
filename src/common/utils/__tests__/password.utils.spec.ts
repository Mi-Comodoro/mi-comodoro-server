import * as argon2 from 'argon2';

import { usePassword } from '../password.utils';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$argon2id$mocked_hash'),
  verify: jest.fn().mockResolvedValue(true),
  argon2id: 2,
}));

describe('usePassword', () => {
  const { passwordHash, passwordIsValid } = usePassword();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('passwordHash', () => {
    it('calls argon2.hash with argon2id algorithm and the expected parameters', async () => {
      await passwordHash('secret123');

      expect(argon2.hash).toHaveBeenCalledWith('secret123', {
        type: argon2.argon2id,
        memoryCost: 65536, // 2 ** 16
        timeCost: 3,
        parallelism: 1,
      });
    });

    it('returns the hashed string from argon2', async () => {
      const result = await passwordHash('secret123');
      expect(result).toBe('$argon2id$mocked_hash');
    });
  });

  describe('passwordIsValid', () => {
    it('returns true when argon2.verify resolves to true', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      const result = await passwordIsValid('$argon2id$stored', 'correct_password');
      expect(result).toBe(true);
    });

    it('returns false when argon2.verify resolves to false', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      const result = await passwordIsValid('$argon2id$stored', 'wrong_password');
      expect(result).toBe(false);
    });

    it('passes stored hash and plain-text input to argon2.verify', async () => {
      await passwordIsValid('$argon2id$stored', 'input_pass');
      expect(argon2.verify).toHaveBeenCalledWith('$argon2id$stored', 'input_pass');
    });
  });
});
