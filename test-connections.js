const mysql = require('mysql2/promise');
const Redis = require('ioredis');
const config = require('./config');

async function testConnections() {
    console.log('=== Testing Local Connections ===\n');

    // Test MySQL Connection
    console.log('Testing MySQL Connection...');
    try {
        const connection = await mysql.createConnection({
            host: config.database.host,
            port: config.database.port,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database
        });
        console.log('✅ MySQL Connection Successful');
        await connection.end();
    } catch (error) {
        console.error('❌ MySQL Connection Failed:', error.message);
    }

    // Test Redis Connection
    console.log('\nTesting Redis Connection...');
    try {
        const redis = new Redis({
            host: config.redis.host,
            port: config.redis.port
        });

        redis.on('connect', () => {
            console.log('✅ Redis Connection Successful');
            redis.quit();
        });

        redis.on('error', (error) => {
            console.error('❌ Redis Connection Failed:', error.message);
            redis.quit();
        });

        // Set a timeout for Redis connection
        setTimeout(() => {
            if (redis.status !== 'ready') {
                console.error('❌ Redis Connection Timeout');
                redis.quit();
            }
        }, 5000);
    } catch (error) {
        console.error('❌ Redis Connection Failed:', error.message);
    }

    // Test Server Port
    console.log('\nTesting Server Port...');
    try {
        const net = require('net');
        const server = net.createServer();
        
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`❌ Port ${config.port} is already in use`);
            }
        });

        server.once('listening', () => {
            console.log(`✅ Port ${config.port} is available`);
            server.close();
        });

        server.listen(config.port);
    } catch (error) {
        console.error('❌ Port Test Failed:', error.message);
    }
}

// Run the tests
testConnections(); 