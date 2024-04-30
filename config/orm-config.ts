import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrmConfig implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    const { type, host, port, username, password, database } = this.configService.get('database');

    return {
      type,
      host,
      port,
      username,
      password,
      database,
      entities: ["dist/**/*.entity{.ts,.js}"],
      synchronize: true,
      logging: true,
    };
  }
}
