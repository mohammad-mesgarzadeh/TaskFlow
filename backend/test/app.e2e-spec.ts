import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health returns 200 ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect((res.body as { status: string }).status).toBe('ok');
      });
  });

  it('GET /api/health/ready returns 200 when the database is up', () => {
    return request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(200)
      .expect((res) => {
        expect(
          (res.body as { checks: { database: string } }).checks.database,
        ).toBe('up');
      });
  });

  it('GET /api/projects without a token returns 401', () => {
    return request(app.getHttpServer()).get('/api/projects').expect(401);
  });
});
