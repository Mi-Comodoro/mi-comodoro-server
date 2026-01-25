import * as argon2 from 'argon2';
export const usePassword = () => {
  const passwordHash = async (password: string) =>
    await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });

  const passwordLowerCase = (password: string) => {
    return password.toLocaleLowerCase();
  };
  const passwordIsValid = async (storagePassword: string, inputPassword: string) => {
    return await argon2.verify(storagePassword, inputPassword);
  };
  return { passwordHash, passwordLowerCase, passwordIsValid };
};
