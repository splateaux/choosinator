// scripts/poke-stream.mjs
// --- make sure we target the local sandbox, not real AWS ---
process.env.ARC_LOCAL = 'true';
process.env.ARC_ENV = process.env.ARC_ENV || 'testing'; // matches your dev script
process.env.AWS_REGION = process.env.AWS_REGION || 'us-west-1'; // your app.arc region
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'dummy';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'dummy';

import arc from '@architect/functions';

const tables = await arc.tables();

await tables.pollVote.put({
    pk: 'poll#abc',
    sk: 'vote#john',
    userId: 'john',
    optionId: 'opt1',
    updatedAt: new Date().toISOString(),
});

console.log('wrote a vote');
process.exit(0);
