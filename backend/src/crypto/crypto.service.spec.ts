import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let cryptoServiceInstance: CryptoService;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    cryptoServiceInstance = testingModule.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(cryptoServiceInstance).toBeDefined();
  });

  it('should encrypt and decrypt a string successfully', () => {
    const seedPhrasePlaintext = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const encryptedSeedPhraseData = cryptoServiceInstance.encryptData(seedPhrasePlaintext);

    expect(encryptedSeedPhraseData).toBeDefined();
    expect(encryptedSeedPhraseData).not.toEqual(seedPhrasePlaintext);
    expect(encryptedSeedPhraseData.split(':').length).toBe(3);

    const decryptedSeedPhrasePlaintext = cryptoServiceInstance.decryptData(encryptedSeedPhraseData);
    expect(decryptedSeedPhrasePlaintext).toEqual(seedPhrasePlaintext);
  });

  it('should throw error when decrypting tampered data', () => {
    const sensitiveDataPlaintext = 'super secret data';
    const encryptedSensitiveData = cryptoServiceInstance.encryptData(sensitiveDataPlaintext);

    const splitEncryptedDataParts = encryptedSensitiveData.split(':');
    splitEncryptedDataParts[2] = splitEncryptedDataParts[2].substring(0, splitEncryptedDataParts[2].length - 1) + (splitEncryptedDataParts[2].endsWith('a') ? 'b' : 'a');
    const tamperedEncryptedData = splitEncryptedDataParts.join(':');

    expect(() => {
      cryptoServiceInstance.decryptData(tamperedEncryptedData);
    }).toThrow('Decryption validation failed');
  });
});
