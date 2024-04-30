import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrmConfig implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    const { type, host, port, username, password, database, synchronize, ssl_required } = this.configService.get('database');

    console.log('Database SSL Required:', ssl_required);

    return {
      type,
      host,
      port,
      username,
      password,
      database,
      entities: ["dist/**/*.entity{.ts,.js}"],
      synchronize: synchronize,
      logging: true,
      ssl: ssl_required,
      extra: ssl_required ? {
        ssl: {
          rejectUnauthorized: false
        }
      } : {}
    };
  }
}
