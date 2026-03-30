import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientStatus } from './schemas/clients.schema';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };

  beforeEach(() => {
    clientModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    service = new ClientsService(clientModel as never);
  });

  it('creates an active client when document number is unique', async () => {
    const dto = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      documentNumber: '123456789',
      phone: '3001234567',
    };

    clientModel.findOne.mockResolvedValue(null);
    clientModel.create.mockResolvedValue({
      ...dto,
      status: ClientStatus.ACTIVO,
    });

    const result = await service.create(dto as never);

    expect(clientModel.findOne).toHaveBeenCalledWith({
      documentNumber: '123456789',
    });
    expect(clientModel.create).toHaveBeenCalledWith({
      ...dto,
      status: ClientStatus.ACTIVO,
    });
    expect(result.status).toBe(ClientStatus.ACTIVO);
  });

  it('rejects duplicate document number on create', async () => {
    clientModel.findOne.mockResolvedValue({
      _id: 'existing-client',
    });

    await expect(
      service.create({ documentNumber: '123456789' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects duplicate document number on update when another client owns it', async () => {
    clientModel.findOne.mockResolvedValue({
      _id: 'another-client',
    });

    await expect(
      service.update('client-1', { documentNumber: '123456789' } as never),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(clientModel.findOne).toHaveBeenCalledWith({
      documentNumber: '123456789',
      _id: { $ne: 'client-1' },
    });
  });

  it('throws when update target does not exist', async () => {
    clientModel.findByIdAndUpdate.mockResolvedValue(null);

    await expect(
      service.update('missing-client', { fullName: 'Updated Name' } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
