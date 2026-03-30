import { UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { UserRole } from './schemas/user.schema';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userModel: {
    findOne: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(() => {
    userModel = {
      findOne: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    service = new AuthService(userModel as never, jwtService as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes email and returns token data for valid credentials', async () => {
    const user = {
      _id: {
        toString: () => 'user-123',
      },
      email: 'admin@autorent.local',
      passwordHash: 'hashed-password',
      role: UserRole.ADMIN,
      isActive: true,
    };

    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });
    jest.mocked(compare).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login('  ADMIN@Autorent.Local ', 'Admin123');

    expect(userModel.findOne).toHaveBeenCalledWith({
      email: 'admin@autorent.local',
    });
    expect(compare).toHaveBeenCalledWith(
      'Admin123',
      'hashed-password',
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-123',
      email: 'admin@autorent.local',
      role: UserRole.ADMIN,
    });
    expect(result).toEqual({
      access_token: 'jwt-token',
      user: {
        id: 'user-123',
        email: 'admin@autorent.local',
        role: UserRole.ADMIN,
      },
    });
  });

  it('throws when user does not exist', async () => {
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.login('missing@autorent.local', 'whatever'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when user is inactive', async () => {
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        isActive: false,
      }),
    });

    await expect(
      service.login('inactive@autorent.local', 'whatever'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when password does not match', async () => {
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        isActive: true,
        passwordHash: 'hashed-password',
      }),
    });
    jest.mocked(compare).mockResolvedValue(false);

    await expect(
      service.login('admin@autorent.local', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
