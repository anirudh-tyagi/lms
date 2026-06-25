import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Role } from '../src/models/User';

const seeds: { email: string; password: string; role: Role }[] = [
  { email: 'admin@lms.com', password: 'Admin@123', role: 'admin' },
  { email: 'sales@lms.com', password: 'Sales@123', role: 'sales' },
  { email: 'sanction@lms.com', password: 'Sanction@123', role: 'sanction' },
  { email: 'disbursement@lms.com', password: 'Disbursement@123', role: 'disbursement' },
  { email: 'collection@lms.com', password: 'Collection@123', role: 'collection' },
  { email: 'borrower@lms.com', password: 'Borrower@123', role: 'borrower' },
];

async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  for (const s of seeds) {
    const existing = await User.findOne({ email: s.email });
    if (existing) {
      console.log(`  skipping ${s.email} (already exists)`);
      continue;
    }
    const hashed = await bcrypt.hash(s.password, 12);
    await User.create({ email: s.email, password: hashed, role: s.role });
    console.log(`  created ${s.role}: ${s.email}`);
  }

  console.log('\nSeed complete. Credentials:');
  for (const s of seeds) {
    console.log(`  [${s.role.padEnd(12)}] ${s.email}  /  ${s.password}`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
