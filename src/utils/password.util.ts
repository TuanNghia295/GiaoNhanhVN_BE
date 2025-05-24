import argon2 from 'argon2';

export const hashData = async (password: string): Promise<string> => {
  try {
    return await argon2.hash(password);
  } catch (err) {
    console.error(err);
    throw new Error('Can not hash password.');
  }
};

export const verifyData = async (
  password: string,
  hashedPassword?: string,
): Promise<boolean> => {
  return await argon2.verify(hashedPassword, password);
};
