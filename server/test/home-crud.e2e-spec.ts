import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Home } from '../src/models/home.model';
import { User } from '../src/models/user.model';
import { Room } from '../src/models/room.model';
import { Device } from '../src/models/device.model';

describe('Home CRUD (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await Home.query().getMongoDBCollection().deleteMany({});
    await Room.query().getMongoDBCollection().deleteMany({});
    await Device.query().getMongoDBCollection().deleteMany({});
    await User.query().getMongoDBCollection().deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete Home CRUD flow', async () => {
    const auth = await registerAndLogin(app);

    const createResponse = await graphQLRequest(app, {
      query: `
        mutation CreateHome($createHomeInput: CreateHomeInput!) {
          createHome(createHomeInput: $createHomeInput) {
            _id
            name
            owner_id
          }
        }
      `,
      variables: {
        createHomeInput: {
          name: 'My First Home',
        },
      },
    }, auth.accessToken);

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.errors).toBeUndefined();
    expect(createResponse.body.data.createHome.name).toBe('My First Home');
    expect(createResponse.body.data.createHome.owner_id).toBe(auth.userId);

    const homeId = createResponse.body.data.createHome._id as string;

    const listResponse = await graphQLRequest(app, {
      query: `
        query Homes {
          homes {
            _id
            name
            owner_id
          }
        }
      `,
    }, auth.accessToken);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.errors).toBeUndefined();
    expect(listResponse.body.data.homes).toHaveLength(1);
    expect(listResponse.body.data.homes[0]._id).toBe(homeId);

    const singleResponse = await graphQLRequest(app, {
      query: `
        query Home($id: String!) {
          home(id: $id) {
            _id
            name
            owner_id
          }
        }
      `,
      variables: {
        id: homeId,
      },
    }, auth.accessToken);

    expect(singleResponse.status).toBe(200);
    expect(singleResponse.body.errors).toBeUndefined();
    expect(singleResponse.body.data.home._id).toBe(homeId);
    expect(singleResponse.body.data.home.name).toBe('My First Home');

    const updateResponse = await graphQLRequest(app, {
      query: `
        mutation UpdateHome($id: String!, $updateHomeInput: UpdateHomeInput!) {
          updateHome(id: $id, updateHomeInput: $updateHomeInput) {
            _id
            name
            owner_id
          }
        }
      `,
      variables: {
        id: homeId,
        updateHomeInput: {
          name: 'Updated Home Name',
        },
      },
    }, auth.accessToken);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.errors).toBeUndefined();
    expect(updateResponse.body.data.updateHome._id).toBe(homeId);
    expect(updateResponse.body.data.updateHome.name).toBe('Updated Home Name');

    const deleteResponse = await graphQLRequest(app, {
      query: `
        mutation DeleteHome($id: String!) {
          deleteHome(id: $id)
        }
      `,
      variables: {
        id: homeId,
      },
    }, auth.accessToken);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.errors).toBeUndefined();
    expect(deleteResponse.body.data.deleteHome).toBe(true);

    const listAfterDeleteResponse = await graphQLRequest(app, {
      query: `
        query Homes {
          homes {
            _id
            name
            owner_id
          }
        }
      `,
    }, auth.accessToken);

    expect(listAfterDeleteResponse.status).toBe(200);
    expect(listAfterDeleteResponse.body.errors).toBeUndefined();
    expect(listAfterDeleteResponse.body.data.homes).toHaveLength(0);
  });

  it('should return dashboard data and execute quick actions', async () => {
    const auth = await registerAndLogin(app);
    const homeId = await createHome(app, auth.accessToken, 'Rumah Utama');

    const livingRoom = await Room.create({
      home_id: homeId,
      name: 'Ruang Tamu',
      createdAt: new Date(),
    });

    const kitchen = await Room.create({
      home_id: homeId,
      name: 'Dapur',
      createdAt: new Date(),
    });

    await Device.createMany([
      {
        room_id: livingRoom._id?.toString() ?? '',
        name: 'Lampu Tamu',
        type: 'light',
        status: 'ON',
        createdAt: new Date(),
      },
      {
        room_id: livingRoom._id?.toString() ?? '',
        name: 'TV',
        type: 'media',
        status: 'OFF',
        createdAt: new Date(),
      },
      {
        room_id: kitchen._id?.toString() ?? '',
        name: 'Lampu Dapur',
        type: 'light',
        status: 'ON',
        createdAt: new Date(),
      },
    ]);

    const dashboardResponse = await graphQLRequest(app, {
      query: `
        query Dashboard($homeId: String) {
          dashboardHome(homeId: $homeId) {
            homeId
            homeName
            homeStatus
            roomsCount
            activeDevicesCount
          }
        }
      `,
      variables: { homeId },
    }, auth.accessToken);

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.errors).toBeUndefined();
    expect(dashboardResponse.body.data.dashboardHome.homeId).toBe(homeId);
    expect(dashboardResponse.body.data.dashboardHome.homeName).toBe('Rumah Utama');
    expect(dashboardResponse.body.data.dashboardHome.roomsCount).toBe(2);
    expect(dashboardResponse.body.data.dashboardHome.activeDevicesCount).toBe(2);
    expect(dashboardResponse.body.data.dashboardHome.homeStatus).toBe('Online');

    const roomsResponse = await graphQLRequest(app, {
      query: `
        query Rooms($homeId: String) {
          roomsByHome(homeId: $homeId) {
            roomId
            name
            activeDevices
            totalDevices
            subtitle
          }
        }
      `,
      variables: { homeId },
    }, auth.accessToken);

    expect(roomsResponse.status).toBe(200);
    expect(roomsResponse.body.errors).toBeUndefined();
    expect(roomsResponse.body.data.roomsByHome).toHaveLength(2);

    const allOffResponse = await graphQLRequest(app, {
      query: `
        mutation AllOff($homeId: String!) {
          allDevicesOff(homeId: $homeId) {
            success
            affectedDevices
            message
          }
        }
      `,
      variables: { homeId },
    }, auth.accessToken);

    expect(allOffResponse.status).toBe(200);
    expect(allOffResponse.body.errors).toBeUndefined();
    expect(allOffResponse.body.data.allDevicesOff.success).toBe(true);
    expect(allOffResponse.body.data.allDevicesOff.affectedDevices).toBe(3);

    const awayModeResponse = await graphQLRequest(app, {
      query: `
        mutation Away($homeId: String!, $enabled: Boolean!) {
          setAwayMode(homeId: $homeId, enabled: $enabled) {
            success
            affectedDevices
            message
          }
        }
      `,
      variables: { homeId, enabled: true },
    }, auth.accessToken);

    expect(awayModeResponse.status).toBe(200);
    expect(awayModeResponse.body.errors).toBeUndefined();
    expect(awayModeResponse.body.data.setAwayMode.success).toBe(true);
  });
});

async function graphQLRequest(
  app: INestApplication<App>,
  body: { query: string; variables?: unknown },
  accessToken?: string,
) {
  const req = request(app.getHttpServer()).post('/graphql');
  if (accessToken) {
    req.set('Authorization', `Bearer ${accessToken}`);
  }

  return req.send(body);
}

async function registerAndLogin(app: INestApplication<App>) {
  const random = Date.now();
  const registerResponse = await graphQLRequest(app, {
    query: `
      mutation Register($createUserInput: CreateUserInput!) {
        register(createUserInput: $createUserInput) {
          userId
          email
          name
          message
        }
      }
    `,
    variables: {
      createUserInput: {
        name: 'Home Owner',
        email: `home-owner-${random}@example.com`,
        password: 'secret123',
      },
    },
  });

  expect(registerResponse.status).toBe(200);
  expect(registerResponse.body.errors).toBeUndefined();

  const email = `home-owner-${random}@example.com`;
  const loginResponse = await graphQLRequest(app, {
    query: `
      mutation Login($loginInput: LoginInput!) {
        login(loginInput: $loginInput) {
          accessToken
          userId
          email
          name
        }
      }
    `,
    variables: {
      loginInput: {
        email,
        password: 'secret123',
      },
    },
  });

  expect(loginResponse.status).toBe(200);
  expect(loginResponse.body.errors).toBeUndefined();

  return {
    userId: loginResponse.body.data.login.userId as string,
    accessToken: loginResponse.body.data.login.accessToken as string,
  };
}

async function createHome(app: INestApplication<App>, accessToken: string, name: string) {
  const response = await graphQLRequest(
    app,
    {
      query: `
        mutation CreateHome($createHomeInput: CreateHomeInput!) {
          createHome(createHomeInput: $createHomeInput) {
            _id
          }
        }
      `,
      variables: {
        createHomeInput: {
          name,
        },
      },
    },
    accessToken,
  );

  expect(response.status).toBe(200);
  expect(response.body.errors).toBeUndefined();

  return response.body.data.createHome._id as string;
}
