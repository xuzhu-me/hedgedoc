/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  BadRequestException,
  Controller,
  Delete,
  Headers,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import {
  ClientError,
  NotInDBError,
  PermissionError,
} from '../../../errors/errors';
import { ConsoleLoggerService } from '../../../logger/console-logger.service';
import { MediaService } from '../../../media/media.service';
import { MulterFile } from '../../../media/multer-file.interface';
import { TokenAuthGuard } from '../../../auth/token-auth.guard';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { MediaUploadUrlDto } from '../../../media/media-upload-url.dto';

@ApiTags('media')
@ApiSecurity('token')
@Controller('media')
export class MediaController {
  constructor(
    private readonly logger: ConsoleLoggerService,
    private mediaService: MediaService,
  ) {
    this.logger.setContext(MediaController.name);
  }

  @UseGuards(TokenAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Req() req: Request,
    @UploadedFile() file: MulterFile,
    @Headers('HedgeDoc-Note') noteId: string,
  ): Promise<MediaUploadUrlDto> {
    const username = req.user.userName;
    this.logger.debug(
      `Recieved filename '${file.originalname}' for note '${noteId}' from user '${username}'`,
      'uploadImage',
    );
    try {
      const url = await this.mediaService.saveFile(
        file.buffer,
        username,
        noteId,
      );
      return this.mediaService.toMediaUploadUrlDto(url);
    } catch (e) {
      if (e instanceof ClientError || e instanceof NotInDBError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  @UseGuards(TokenAuthGuard)
  @Delete(':filename')
  async deleteMedia(
    @Req() req: Request,
    @Param('filename') filename: string,
  ): Promise<void> {
    const username = req.user.userName;
    try {
      await this.mediaService.deleteFile(filename, username);
    } catch (e) {
      if (e instanceof PermissionError) {
        throw new UnauthorizedException(e.message);
      }
      if (e instanceof NotInDBError) {
        throw new NotFoundException(e.message);
      }
      throw e;
    }
  }
}
