import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let supabaseServiceInstance: SupabaseService;
  let mockConfigurationService: Partial<ConfigService>;

  beforeEach(async () => {
    mockConfigurationService = {
      get: jest.fn().mockImplementation((configurationKey: string) => {
        if (configurationKey === 'SUPABASE_URL') return 'https://test.supabase.co';
        if (configurationKey === 'SUPABASE_KEY') return 'test-anon-key';
        return null;
      }),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: mockConfigurationService,
        },
      ],
    }).compile();

    supabaseServiceInstance = testingModule.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(supabaseServiceInstance).toBeDefined();
  });

  it('should initialize the supabase client successfully', () => {
    supabaseServiceInstance.onModuleInit();
    expect(supabaseServiceInstance.databaseClient).toBeDefined();
  });
});
