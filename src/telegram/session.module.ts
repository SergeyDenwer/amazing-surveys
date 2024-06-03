import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrmConfig } from '../../config/orm-config';
import { Postgres } from '@telegraf/session/pg';
import { Pool } from 'pg';

@Module({
  imports: [ConfigModule],
  providers: [
    OrmConfig,
    {
      provide: 'SESSION_STORE',
      useFactory: (configService: ConfigService) => {
        const { host, port, username, password, database, ssl_required } = configService.get('database');

        const pool = new Pool({
          host,
          port,
          user: username,
          password,
          database,
          ssl: ssl_required ? {
            rejectUnauthorized: false,
          } : undefined,
        });

        return Postgres({ pool });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['SESSION_STORE'],
})
export class SessionModule {}
