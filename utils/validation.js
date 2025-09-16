// utils/validators.js
export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validatePassword(password) {
  // Min 8 chars, uppercase, lowercase, number, special char
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
  return regex.test(password);
}
