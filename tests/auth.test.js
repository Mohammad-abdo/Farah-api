const request = require('supertest');
const { faker } = require('@faker-js/faker');

describe('Auth Endpoints', () => {
    let server;
    let app;

    beforeAll(() => {
        // Import app after env is set
        app = require('../src/server');
    });

    afterAll((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user with valid data', async () => {
            const userData = {
                name: faker.person.fullName(),
                phone: faker.string.numeric(10),
                email: faker.internet.email(),
                password: 'password123',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.phone).toBe(userData.phone);
        });

        it('should fail with missing name', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    phone: faker.string.numeric(10),
                    password: 'password123',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
        });

        it('should fail with invalid phone number', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: faker.person.fullName(),
                    phone: '123', // Too short
                    password: 'password123',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should fail with duplicate phone number', async () => {
            const phone = faker.string.numeric(10);

            // Register first user
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: faker.person.fullName(),
                    phone,
                    password: 'password123',
                });

            // Try to register with same phone
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: faker.person.fullName(),
                    phone,
                    password: 'password123',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        const testUser = {
            name: faker.person.fullName(),
            phone: faker.string.numeric(10),
            password: 'password123',
        };

        beforeAll(async () => {
            // Create test user
            await request(app)
                .post('/api/auth/register')
                .send(testUser);
        });

        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    phone: testUser.phone,
                    password: testUser.password,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.phone).toBe(testUser.phone);
        });

        it('should fail with invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    phone: testUser.phone,
                    password: 'wrongpassword',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with non-existent phone', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    phone: faker.string.numeric(10),
                    password: 'password123',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/auth/me', () => {
        let authToken;
        const testUser = {
            name: faker.person.fullName(),
            phone: faker.string.numeric(10),
            password: 'password123',
        };

        beforeAll(async () => {
            // Register and login
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            authToken = registerResponse.body.token;
        });

        it('should get current user with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.user.phone).toBe(testUser.phone);
        });

        it('should fail without token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should fail with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});
