import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common/interfaces';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import mongoose, { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

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

    const vehiclesCollection = connection.collections.vehicles;
    if (vehiclesCollection) {
      await vehiclesCollection.deleteMany({});
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
});
