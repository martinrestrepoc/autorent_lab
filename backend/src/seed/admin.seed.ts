import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../auth/schemas/user.schema';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const existingAdmin = await this.userModel
      .findOne({ role: UserRole.ADMIN })
      .exec();

    if (existingAdmin) {
      return;
    }

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.warn(
        'No ADMIN_EMAIL/ADMIN_PASSWORD provided. Admin seed skipped.',
      );
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await this.userModel.create({
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    });

    this.logger.log(`Admin user created: ${adminEmail.toLowerCase().trim()}`);
  }
}
