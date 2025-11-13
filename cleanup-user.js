const Database = require('better-sqlite3');
const db = new Database('./todos.db');

// Delete bad authenticator
db.prepare('DELETE FROM authenticators WHERE credential_id = ?').run('');

// Delete user Dave
db.prepare('DELETE FROM users WHERE username = ?').run('Dave');

console.log('✅ Deleted corrupted user data');
console.log('You can now register again with username "Dave"');

db.close();
