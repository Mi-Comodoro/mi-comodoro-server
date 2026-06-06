import { Test, TestingModule } from '@nestjs/testing';

import { LoggerProviderService } from '@/core/providers';

import { UserProfileService } from '../user-profile.service';

const mockRepo = { findById: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('UserProfileService', () => {
  let service: UserProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        { provide: LoggerProviderService, useValue: mockLogger },
        { provide: 'UserProfileRepository', useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
    jest.clearAllMocks();
  });

  describe('getAccountById', () => {
    it('returns profile when found', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'profile-1', name: 'Test' });
      const result = await service.getAccountById('profile-1');
      expect(mockRepo.findById).toHaveBeenCalledWith('profile-1');
      expect(result?.id).toBe('profile-1');
    });

    it('returns null when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      const result = await service.getAccountById('unknown');
      expect(result).toBeNull();
    });
  });
});
