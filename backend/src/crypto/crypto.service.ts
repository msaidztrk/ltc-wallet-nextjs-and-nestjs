import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly cipherAlgorithm = 'aes-256-gcm';
  private readonly initializationVectorLength = 16;
  private readonly systemEncryptionKey = process.env.ENCRYPTION_SECRET || '12345678901234567890123456789012';

  encryptData(dataToEncrypt: string): string {
    const initializationVector = crypto.randomBytes(this.initializationVectorLength);
    const encryptionKeyBuffer = Buffer.from(this.systemEncryptionKey);

    const cipherInstance = crypto.createCipheriv(this.cipherAlgorithm, encryptionKeyBuffer, initializationVector);

    let encryptedHexData = cipherInstance.update(dataToEncrypt, 'utf8', 'hex');
    encryptedHexData += cipherInstance.final('hex');
    const authenticationTag = cipherInstance.getAuthTag().toString('hex');

    return `${initializationVector.toString('hex')}:${authenticationTag}:${encryptedHexData}`;
  }

  decryptData(encryptedTextData: string): string {
    const encryptedDataParts = encryptedTextData.split(':');
    if (encryptedDataParts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const initializationVectorBuffer = Buffer.from(encryptedDataParts[0], 'hex');
    const authenticationTagBuffer = Buffer.from(encryptedDataParts[1], 'hex');
    const encryptedHexData = encryptedDataParts[2];
    const encryptionKeyBuffer = Buffer.from(this.systemEncryptionKey);

    const decipherInstance = crypto.createDecipheriv(this.cipherAlgorithm, encryptionKeyBuffer, initializationVectorBuffer);
    decipherInstance.setAuthTag(authenticationTagBuffer);

    try {
      let decryptedPlaintext = decipherInstance.update(encryptedHexData, 'hex', 'utf8');
      decryptedPlaintext += decipherInstance.final('utf8');
      return decryptedPlaintext;
    } catch (e) {
      throw new Error('Decryption validation failed');
    }
  }
}
