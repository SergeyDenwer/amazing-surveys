import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrmConfig implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    const { type, host, port, username, password, database, synchronize, ssl_required } = this.configService.get('database');

    return {
      type,
      host,
      port,
      username,
      password,
      database,
      entities: ["dist/**/*.entity{.ts,.js}"],
      synchronize: synchronize,
      logging: false,
      ssl: ssl_required,
      extra: ssl_required ? {
        ssl: {
          rejectUnauthorized: false
        }
      } : {}
    };
  }

  createPostgresOptions() {
    const { host, port, username, password, database, ssl_required } = this.configService.get('database');
    return {
      host,
      port,
      user: username,
      password,
      database,
      ssl: ssl_required ? {
        rejectUnauthorized: false
      } : undefined,
    };
  }
}
