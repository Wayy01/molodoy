import "server-only";

// No 0/O, 1/l/I: the password is read off a phone screen and typed by hand.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** e.g. "k7Qm-x9Tp-R4ha", shown once and then only stored as a bcrypt hash. */
export function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
