import { BadRequestException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let vehicleModel: {
    exists: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    vehicleModel = {
      exists: jest.fn(),
      create: jest.fn(),
    };

    service = new VehiclesService(
      vehicleModel as never,
      {} as never,
      {} as never,
    );
  });

  it('normalizes the plate, rejects duplicates and defaults to DISPONIBLE', async () => {
    vehicleModel.exists.mockResolvedValue(null);
    vehicleModel.create.mockResolvedValue({
      plate: 'ABC123',
      status: 'DISPONIBLE',
    });

    const result = await service.create({
      plate: 'abc123',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2024,
    });

    expect(vehicleModel.exists).toHaveBeenCalledWith({ plate: 'ABC123' });
    expect(vehicleModel.create).toHaveBeenCalledWith({
      plate: 'ABC123',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2024,
      status: 'DISPONIBLE',
    });
    expect(result.status).toBe('DISPONIBLE');
  });

  it('throws when the normalized plate already exists', async () => {
    vehicleModel.exists.mockResolvedValue({
      _id: 'vehicle-1',
    });

    await expect(
      service.create({
        plate: 'abc123',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2024,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
