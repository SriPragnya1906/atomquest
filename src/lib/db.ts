import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// On serverless environments (like Vercel), SQLite's write operations (even locking/journaling)
// fail on read-only filesystems. To bypass this, we copy the database file to /tmp
// and connect Prisma to the temporary database.

let databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  const tempDbPath = '/tmp/dev.db';
  
  // Resolve source database path relative to project root
  const sourceDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  
  try {
    if (!fs.existsSync(tempDbPath)) {
      if (fs.existsSync(sourceDbPath)) {
        console.log(`Copying database from ${sourceDbPath} to ${tempDbPath}`);
        fs.copyFileSync(sourceDbPath, tempDbPath);
      } else {
        console.error(`Source database not found at ${sourceDbPath}. Creating empty database file.`);
        fs.writeFileSync(tempDbPath, '');
      }
    } else {
      console.log(`Database already exists at ${tempDbPath}`);
    }
    
    // Override connection URL to use /tmp/dev.db
    databaseUrl = `file:${tempDbPath}`;
  } catch (err) {
    console.error('Failed to copy database to /tmp:', err);
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
