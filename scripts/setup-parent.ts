/**
 * Inserts / updates the test admin-parent in MongoDB.
 *
 * Run:  bun run scripts/setup-parent.ts
 *
 * Reads from .env.local (Bun loads it automatically):
 *   TEST_PHONE        = +9779861724281
 *   CALLMEBOT_API_KEY = <key received from CallMeBot>
 */

import mongoose from 'mongoose';

const MONGODB_URI   = process.env.MONGODB_URI   ?? '';
const TEST_PHONE    = process.env.TEST_PHONE    ?? '+9779861724281';
const CALLMEBOT_KEY = process.env.CALLMEBOT_API_KEY ?? '';

/* ── validate ────────────────────────────────────────────── */
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI not set in .env.local'); process.exit(1);
}
if (!CALLMEBOT_KEY || CALLMEBOT_KEY === 'your-callmebot-api-key') {
  console.error('\n❌  CALLMEBOT_API_KEY is not set.');
  console.error('   Edit .env.local → CALLMEBOT_API_KEY=<your key>\n');
  process.exit(1);
}

/* ── schema ──────────────────────────────────────────────── */
const ParentSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  phone:             { type: String, required: true, unique: true },
  email:             String,
  callmebotApiKey:   String,
  whatsappActivated: { type: Boolean, default: false },
  createdAt:         { type: Date,    default: Date.now },
});
const Parent =
  (mongoose.models.Parent as mongoose.Model<mongoose.InferSchemaType<typeof ParentSchema>>) ??
  mongoose.model('Parent', ParentSchema);

/* ── main ────────────────────────────────────────────────── */
async function main() {
  console.log('\n🔌  Connecting to MongoDB Atlas…');
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log('✅  Connected.\n');

  await Parent.updateOne(
    { phone: TEST_PHONE },
    {
      $set: {
        name:              'Test Admin',
        phone:             TEST_PHONE,
        callmebotApiKey:   CALLMEBOT_KEY,
        whatsappActivated: true,
        createdAt:         new Date(),
      },
    },
    { upsert: true }
  );

  const doc = await Parent.findOne({ phone: TEST_PHONE }).lean();
  if (!doc) throw new Error('Upsert failed — document not found after write');

  console.log('✅  Parent upserted!');
  console.log('   _id    :', String(doc._id));
  console.log('   name   :', doc.name);
  console.log('   phone  :', doc.phone);
  console.log('   apiKey :', doc.callmebotApiKey);
  console.log('   active :', doc.whatsappActivated);
  console.log('\n🎉  You can now log in at http://localhost:3000/login');
  console.log('   → Select role "Parent" or "Admin"');
  console.log(`   → Enter phone: ${TEST_PHONE}`);
  console.log('   → Receive OTP on WhatsApp and verify\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌  Error:', err.message ?? err);
  process.exit(1);
});
