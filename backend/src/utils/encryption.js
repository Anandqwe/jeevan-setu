/**
 * AES-256-CBC Encryption Utility
 * Used for encrypting sensitive medical data before storing in MongoDB
 */

const crypto = require('crypto');

// Algorithm configuration
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

/**
 * Get encryption key from environment variable
 * Key must be exactly 32 bytes (256 bits) for AES-256
 */
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY not found in environment variables');
  }
  // Ensure key is exactly 32 bytes by hashing if necessary
  return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encryptedData (both hex encoded)
 */
const encrypt = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV and encrypted data together (IV is needed for decryption)
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt an AES-256-CBC encrypted string
 * @param {string} encryptedText - Encrypted text in format: iv:encryptedData
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') {
    return encryptedText;
  }

  // Check if text is actually encrypted (contains IV separator)
  if (!encryptedText.includes(':')) {
    return encryptedText;
  }

  try {
    const key = getEncryptionKey();
    const [ivHex, encrypted] = encryptedText.split(':');
    
    if (!ivHex || !encrypted) {
      return encryptedText;
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    // Return original if decryption fails (might not be encrypted)
    return encryptedText;
  }
};

/**
 * Encrypt specific fields in an object
 * @param {object} obj - Object containing fields to encrypt
 * @param {string[]} fieldsToEncrypt - Array of field names to encrypt
 * @returns {object} - Object with specified fields encrypted
 */
const encryptFields = (obj, fieldsToEncrypt) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj };
  
  fieldsToEncrypt.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field]);
    }
  });
  
  return result;
};

/**
 * Decrypt specific fields in an object
 * @param {object} obj - Object containing encrypted fields
 * @param {string[]} fieldsToDecrypt - Array of field names to decrypt
 * @returns {object} - Object with specified fields decrypted
 */
const decryptFields = (obj, fieldsToDecrypt) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj };
  
  fieldsToDecrypt.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decrypt(result[field]);
    }
  });
  
  return result;
};

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  ENCRYPTED_MEDICAL_FIELDS: ['allergies', 'regularMedications', 'disabilities', 'medicalReportMetadata']
};
