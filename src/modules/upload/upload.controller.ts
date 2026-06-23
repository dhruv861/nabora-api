import {
  Controller,
  Post,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { IStorageProvider } from '../../providers/storage/storage.interface';
import { STORAGE_PROVIDER } from '../../providers/storage/storage.interface';
import { UploadType } from '../../common/types/enums';
import * as path from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function getUploadKey(type: string, userId: string, file: Express.Multer.File): string {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  switch (type) {
    case UploadType.AVATAR:
      return `avatars/${userId}${ext}`;
    case UploadType.LOGO:
      return `logos/${userId}${ext}`;
    case UploadType.PORTFOLIO:
      return `portfolio/${userId}/${Date.now()}${ext}`;
    case UploadType.VERIFICATION:
      return `verification/${userId}/${Date.now()}${ext}`;
    case UploadType.SELFIE:
      return `selfies/${userId}/${Date.now()}${ext}`;
    case UploadType.DISPUTE_EVIDENCE:
      return `dispute-evidence/${userId}/${Date.now()}${ext}`;
    default:
      return `misc/${userId}/${Date.now()}${ext}`;
  }
}

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a file (avatar, portfolio, logo, verification, selfie, dispute evidence)' })
  @ApiQuery({ name: 'type', enum: Object.values(UploadType), required: true })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'File to upload', schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Request() req: { user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, and WebP files are allowed');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File must be smaller than 5 MB');
    }

    const key = getUploadKey(type ?? UploadType.AVATAR, req.user.id, file);
    const url = await this.storage.upload(key, file.buffer, file.mimetype);

    return { url };
  }
}
