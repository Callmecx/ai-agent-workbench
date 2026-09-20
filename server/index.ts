import { app } from './app.js';
import { config } from './config.js';
import { db } from './services/database.js';
import { processDocument } from './services/knowledge.js';
app.listen(config.port, config.host, () => { process.stdout.write(`Workbench BFF: http://${config.host}:${config.port}\n`); });
for (const doc of db.documents) if (['PENDING', 'PARSING', 'EMBEDDING'].includes(doc.status)) void processDocument(doc.id);
