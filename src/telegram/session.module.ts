// session.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrmConfig } from '../../config/orm-config';
import { Postgres } from '@telegraf/session/pg';

@Module({
  imports: [ConfigModule],
  providers: [
    OrmConfig,
    {
      provide: 'SESSION_STORE',
      useFactory: (ormConfig: OrmConfig) => {
        const postgresOptions = ormConfig.createPostgresOptions();
        return Postgres(postgresOptions);
      },
      inject: [OrmConfig],
    },
  ],
  exports: ['SESSION_STORE'],
})
export class SessionModule {}