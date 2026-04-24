import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common/interfaces';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import mongoose, { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';

const TEST_MONGO_URI =
  process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/autorent_test_ci';

jest.setTimeout(30000);

process.env.MONGO_URI = TEST_MONGO_URI;
process.env.JWT_SECRET ??= 'test-secret';
process.env.JWT_EXPIRES_IN ??= '1d';
process.env.ADMIN_EMAIL ??= 'admin@autorent.local';
process.env.ADMIN_PASSWORD ??= 'Admin123';

describe('Auth and Vehicles (e2e)', () => {
  let app: INestApplication<App>;
  let connection: Connection;

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();

    // Jest carga el módulo aquí para que AppModule lea MONGO_URI ya inicializado.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require('./../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    if (!connection) {
      return;
    }

    const rentsCollection = connection.collections.rents;
    if (rentsCollection) {
      await rentsCollection.deleteMany({});
    }

    const vehiclesCollection = connection.collections.vehicles;
    if (vehiclesCollection) {
      await vehiclesCollection.deleteMany({});
    }

    const clientsCollection = connection.collections.clients;
    if (clientsCollection) {
      await clientsCollection.deleteMany({});
    }
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
    }
    if (app) {
      await app.close();
    }
  });

  async function loginAndGetToken() {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(200);

    return response.body.access_token as string;
  }

  async function createClient() {
    const response = await request(app.getHttpServer())
      .post('/clients')
      .send({
        fullName: 'Cliente Prueba Finalizacion',
        documentType: 'CC',
        documentNumber: '1234567890',
        phone: '3001234567',
        email: 'cliente.finalizacion@example.com',
      })
      .expect(201);

    return response.body.client._id as string;
  }

  async function createVehicle(token: string) {
    const response = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plate: 'XYZ789',
        brand: 'Mazda',
        model: 'CX5',
        year: 2026,
      })
      .expect(201);

    return response.body.vehicle._id as string;
  }

  it('rejects invalid credentials on POST /auth/login', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: process.env.ADMIN_EMAIL,
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Credenciales inválidas');
  });

  it('returns a token for valid credentials on POST /auth/login', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(200);

    expect(response.body.access_token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email: process.env.ADMIN_EMAIL?.toLowerCase(),
      role: 'ADMIN',
    });
  });

  it('creates and lists vehicles with auth', async () => {
    const token = await loginAndGetToken();

    const createResponse = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plate: 'ABC123',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2024,
      })
      .expect(201);

    expect(createResponse.body.message).toBe('Vehículo creado con éxito');
    expect(createResponse.body.vehicle).toMatchObject({
      plate: 'ABC123',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2024,
      status: 'DISPONIBLE',
    });

    const listResponse = await request(app.getHttpServer())
      .get('/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          plate: 'ABC123',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2024,
        }),
      ]),
    );
  });

  it('finalizes rents with a closing damage report', async () => {
    const token = await loginAndGetToken();
    const clientId = await createClient();
    const vehicleId = await createVehicle(token);
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().slice(0, 10);
    const startDate = formatDate(today);
    const plannedEndDate = formatDate(
      new Date(today.getTime() + 24 * 60 * 60 * 1000),
    );
    const finalDate = formatDate(
      new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
    );

    const createRentResponse = await request(app.getHttpServer())
      .post('/alquileres')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente: clientId,
        vehiculo: vehicleId,
        fechaInicio: startDate,
        fechaFin: plannedEndDate,
      })
      .expect(201);

    const rentId = createRentResponse.body._id as string;

    const finalizeResponse = await request(app.getHttpServer())
      .patch(`/alquileres/${rentId}/finalizar`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fechaFinReal: finalDate,
        hayDanos: true,
        descripcionReporte:
          'Rayon leve en el bumper delantero y marca superficial en la puerta derecha al cierre.',
      })
      .expect(200);

    expect(finalizeResponse.body.message).toBe('Contrato finalizado con éxito');
    expect(finalizeResponse.body.alquiler).toMatchObject({
      _id: rentId,
      estado: 'FINALIZADO',
      diasExceso: 2,
      reporteCierre: {
        hayDanos: true,
        descripcion:
          'Rayon leve en el bumper delantero y marca superficial en la puerta derecha al cierre.',
      },
    });
    expect(finalizeResponse.body.alquiler.fechaFinReal).toContain(finalDate);
    expect(finalizeResponse.body.alquiler.reporteCierre.fechaReporte).toEqual(
      expect.any(String),
    );

    const rentsResponse = await request(app.getHttpServer())
      .get('/alquileres')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(rentsResponse.body)).toBe(true);
    expect(rentsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: rentId,
          estado: 'FINALIZADO',
          diasExceso: 2,
          reporteCierre: expect.objectContaining({
            hayDanos: true,
            descripcion:
              'Rayon leve en el bumper delantero y marca superficial en la puerta derecha al cierre.',
          }),
        }),
      ]),
    );
  });
});
