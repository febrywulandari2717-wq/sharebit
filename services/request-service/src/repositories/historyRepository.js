async function addHistory(conn, h) {
  await conn.query(
    `INSERT INTO request_history (request_id, from_status, to_status, actor_id, actor_role, reason, at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [h.request_id, h.from_status || null, h.to_status, h.actor_id || null, h.actor_role, h.reason || null]
  );
}

async function listByRequest(conn, requestId) {
  const [rows] = await conn.query(
    'SELECT from_status, to_status, actor_id, actor_role, reason, at FROM request_history WHERE request_id = ? ORDER BY id ASC',
    [requestId]
  );
  return rows;
}

module.exports = { addHistory, listByRequest };
