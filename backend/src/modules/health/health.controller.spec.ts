import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  const prisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new HealthController(prisma as unknown as PrismaService);
  });

  it('reports ok for liveness', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('reports ok for readiness when the database is reachable', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await controller.ready();

    expect(result.status).toBe('ok');
    expect(result.checks.database).toBe('up');
  });

  it('throws ServiceUnavailableException when the database is unreachable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(controller.ready()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
