import { DRIZZLE } from '@/database/global';
import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schemas';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.get<string>('DATABASE_URL'),
        });
        // Retry logic for database connection
        await connectWithRetry(pool); // Using retry logic here

        // Graceful shutdown handling
        process.on('SIGTERM', async () => {
          Logger.log(
            'Shutting down database connection pool...',
            'DatabaseModule',
          );
          await pool.end();
          // process.exit(0);
        });

        process.on('SIGINT', async () => {
          Logger.log(
            'Shutting down database connection pool...',
            'DatabaseModule',
          );
          await pool.end();
          // process.exit(0);
        });
        return drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}

// Retry logic function
async function connectWithRetry(
  pool: Pool,
  retries = 5,
  delay = 2000,
): Promise<void> {
  const logger = new Logger('DatabaseModule');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.log(
        `Attempting database connection (Attempt ${attempt} of ${retries})...`,
      );
      await pool.query('SELECT 1'); // This line checks if the connection is successful
      logger.log('Database connected successfully');
      return; // Exit if successful
    } catch (error) {
      logger.error(`Database connection failed: ${error.message}`);

      if (attempt < retries) {
        logger.warn(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error('Max retries reached. Exiting...');
        process.exit(1); // Exit the application if connection fails after retries
      }
    }
  }
}
