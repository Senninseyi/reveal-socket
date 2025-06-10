-- Add new columns to messages table
ALTER TABLE messages
ADD COLUMN parent_message_id INT NULL,
ADD COLUMN reply_to_message_id INT NULL,
ADD COLUMN attachment_path TEXT NULL,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD FOREIGN KEY (parent_message_id) REFERENCES messages(id),
ADD FOREIGN KEY (reply_to_message_id) REFERENCES messages(id);

-- Add index for faster parent message lookups
CREATE INDEX idx_parent_message_id ON messages(parent_message_id);
CREATE INDEX idx_reply_to_message_id ON messages(reply_to_message_id);
CREATE INDEX idx_created_at ON messages(created_at); 