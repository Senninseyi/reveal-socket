const mysql = require("mysql2/promise");
const config = require("./config");
const crypto = require("crypto");

// List of random first names
const firstNames = [
  "John",
  "Emma",
  "Michael",
  "Sophia",
  "William",
  "Olivia",
  "James",
  "Ava",
  "Alexander",
  "Isabella",
  "Benjamin",
  "Mia",
  "Elijah",
  "Charlotte",
  "Lucas",
  "Amelia",
  "Mason",
  "Harper",
  "Logan",
  "Evelyn",
  "Oliver",
  "Abigail",
  "Jacob",
  "Emily",
  "Sebastian",
  "Elizabeth",
  "Henry",
  "Sofia",
  "David",
  "Avery",
];

// List of random last names
const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
];

// Generate random email
function generateEmail(firstName, lastName) {
  const domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomDomain}`;
}

// Generate random password (simple for testing)
function generatePassword() {
  return "Test123!"; // Using a simple password for testing
}

// Generate permanent token
function generateToken(userId, username) {
  // Create a unique string combining user ID and username
  const uniqueString = `${userId}:${username}:${Date.now()}`;
  // Generate a hash using SHA-256
  return crypto.createHash("sha256").update(uniqueString).digest("hex");
}

// Generate random users
async function generateUsers(count = 10) {
  const connection = await mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
  });

  console.log("=== Generating Random Users ===\n");

  try {
    // First, ensure the tokens table exists
    await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_tokens (
                user_id INT PRIMARY KEY,
                token VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

    for (let i = 0; i < count; i++) {
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      const email = generateEmail(firstName, lastName);
      const password = generatePassword();

      // Insert user
      const [result] = await connection.execute(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, password]
      );

      const userId = result.insertId;
      const token = generateToken(userId, username);

      // Store token
      await connection.execute(
        "INSERT INTO user_tokens (user_id, token) VALUES (?, ?)",
        [userId, token]
      );

      console.log(`✅ Created user: ${username}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Token: ${token}\n`);
    }

    console.log("=== User Generation Complete ===");
    console.log(`Created ${count} users successfully!`);
  } catch (error) {
    console.error("Error generating users:", error.message);
  } finally {
    await connection.end();
  }
}

// Generate 10 random users
generateUsers(10);
