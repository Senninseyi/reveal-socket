CREATE DATABASE IF NOT EXISTS chat_db;
USE chat_db;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id),
    UNIQUE KEY unique_conversation (user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Insert some sample chat rooms
INSERT INTO chat_rooms (name) VALUES 
('General'),
('Random'),
('Support'); 