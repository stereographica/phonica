/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/master/equipment/route';
import { prismaMock } from '../../../../../../jest.setup'; // Prismaモックをインポート
import { NextRequest } from 'next/server';
import { Equipment, Prisma } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockRequest(method: string, body?: any, searchParams?: URLSearchParams): NextRequest {
  const url = new URL(`http://localhost/api/master/equipment${searchParams ? `?${searchParams.toString()}` : ''}`);
  const request = new Request(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return request as NextRequest;
}

describe('/api/master/equipment', () => {
  describe('GET', () => {
    it('should return a list of equipments', async () => {
      const mockEquipments: Equipment[] = [
        {
          id: 'eq1', name: 'Test Recorder', type: 'Recorder', 
          manufacturer: 'TestBrand', memo: 'Test memo 1', 
          createdAt: new Date(), updatedAt: new Date(),
        },
        {
          id: 'eq2', name: 'Test Mic', type: 'Microphone', 
          manufacturer: 'AnotherBrand', memo: 'Test memo 2', 
          createdAt: new Date(), updatedAt: new Date(),
        },
      ];
      prismaMock.equipment.findMany.mockResolvedValue(mockEquipments);

      const response = await GET();
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toHaveLength(2);
      expect(responseBody[0].name).toBe('Test Recorder');
      expect(prismaMock.equipment.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return 500 if Prisma query fails', async () => {
      prismaMock.equipment.findMany.mockRejectedValue(new Error('DB Error'));
      const response = await GET();
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to fetch equipments');
    });
  });

  describe('POST', () => {
    const validEquipmentData = {
      name: 'New Test Equipment',
      type: 'Audio Interface',
      manufacturer: 'Focusrite',
      memo: 'Scarlett 2i2',
    };

    it('should create a new equipment and return 201', async () => {
      const createdEquipmentResponse: Equipment = {
        id: 'eq3',
        ...validEquipmentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.equipment.create.mockResolvedValue(createdEquipmentResponse);

      const request = createMockRequest('POST', validEquipmentData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.name).toBe(validEquipmentData.name);
      expect(prismaMock.equipment.create).toHaveBeenCalledWith({
        data: validEquipmentData,
      });
    });

    it('should return 400 if required fields (name) are missing', async () => {
      const request = createMockRequest('POST', { type: 'Recorder' }); // name を欠落させる
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Missing required fields: name, type');
    });
    
    it('should return 400 if required fields (type) are missing', async () => {
      const request = createMockRequest('POST', { name: 'Incomplete Equipment' }); // type を欠落させる
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.error).toBe('Missing required fields: name, type');
    });

    it('should return 409 if name already exists', async () => {
      const knownError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: 'mock.version', meta: { target: ['name'] } }
      );
      prismaMock.equipment.create.mockRejectedValue(knownError);

      const request = createMockRequest('POST', validEquipmentData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.error).toBe('Failed to create equipment: Name already exists.');
    });

    it('should return 500 for other database errors on create', async () => {
      prismaMock.equipment.create.mockRejectedValue(new Error('Some other DB error'));
      const request = createMockRequest('POST', validEquipmentData);
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.error).toBe('Failed to create equipment');
    });
  });
}); 
