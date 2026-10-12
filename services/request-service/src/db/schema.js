const { pool } = require('./pool');

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS requests (
    id CHAR(36) NOT NULL PRIMARY KEY,
    food_id BIGINT UNSIGNED NOT NULL,
    food_title VARCHAR(120) NULL,
    donor_id BIGINT UNSIGNED NULL,
    recipient_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    note VARCHAR(255) NULL,
    status ENUM('reserving','pending','approved','rejected','scheduled','completed','cancelled','expired','failed') NOT NULL,
    rejection_reason VARCHAR(255) NULL,
    idempotency_key CHAR(36) NOT NULL,
    active_slot TINYINT NULL,
    stock_released TINYINT(1) NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_idempotency (idempotency_key),
    UNIQUE KEY uq_active_request (recipient_id, food_id, active_slot),
    KEY idx_recipient (recipient_id),
    KEY idx_donor (donor_id),
    KEY idx_food (food_id),
    KEY idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS request_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id CHAR(36) NOT NULL,
    from_status VARCHAR(20) NULL,
    to_status VARCHAR(20) NOT NULL,
    actor_id BIGINT UNSIGNED NULL,
    actor_role VARCHAR(20) NOT NULL,
    reason VARCHAR(255) NULL,
    at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_request (request_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function migrate() {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
  }
}

module.exports = { migrate };
