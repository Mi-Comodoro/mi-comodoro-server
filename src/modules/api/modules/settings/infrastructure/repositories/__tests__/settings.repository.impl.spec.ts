import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { SettingsEntity } from '../../database/entities/settings.entity';
import { SettingsRepositoryImpl } from '../settings.repository.impl';

const mockRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const makeSettingsEntity = (overrides = {}) => ({
  id: 'settings-1',
  userId: 'user-1',
  language: 'es',
  theme: 'light',
  currency: 'MXN',
  ...overrides,
});

describe('SettingsRepositoryImpl', () => {
  let repository: SettingsRepositoryImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsRepositoryImpl,
        { provide: getRepositoryToken(SettingsEntity), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<SettingsRepositoryImpl>(SettingsRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('returns settings when found', async () => {
      mockRepo.findOne.mockResolvedValue(makeSettingsEntity());
      const result = await repository.findByUserId('user-1');
      expect(result).not.toBeNull();
    });

    it('returns null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repository.findByUserId('unknown');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('creates new settings when none exist', async () => {
      const entity = makeSettingsEntity();
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);
      const result = await repository.upsert('user-1', { language: 'es' } as never);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
      expect(result).toMatchObject({ id: 'settings-1' });
    });

    it('updates existing settings when found', async () => {
      const entity = makeSettingsEntity();
      mockRepo.findOne.mockResolvedValue(entity);
      mockRepo.save.mockResolvedValue({ ...entity, language: 'en' });
      const result = await repository.upsert('user-1', { language: 'en' } as never);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'settings-1' });
    });
  });

  describe('update', () => {
    it('updates settings and returns updated entity', async () => {
      const entity = makeSettingsEntity();
      mockRepo.update.mockResolvedValue(undefined);
      mockRepo.findOne.mockResolvedValue({ ...entity, language: 'en' });
      const result = await repository.update('user-1', { language: 'en' } as never);
      expect(mockRepo.update).toHaveBeenCalledWith({ userId: 'user-1' }, { language: 'en' });
      expect(result).not.toBeNull();
    });
  });
});
