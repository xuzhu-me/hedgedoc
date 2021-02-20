/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import mediaConfiguration from '../../config/media.config';
import { ConsoleLoggerService } from '../../logger/console-logger.service';
import { MediaBackend } from '../media-backend.interface';
import { BackendData } from '../media-upload.entity';
import { MediaConfig } from '../../config/media.config';

@Injectable()
export class FilesystemBackend implements MediaBackend {
  uploadDirectory = './uploads';

  constructor(
    private readonly logger: ConsoleLoggerService,
    @Inject(mediaConfiguration.KEY)
    private mediaConfig: MediaConfig,
  ) {
    this.logger.setContext(FilesystemBackend.name);
    this.uploadDirectory = mediaConfig.backend.filesystem.uploadPath;
  }

  async saveFile(
    buffer: Buffer,
    fileName: string,
  ): Promise<[string, BackendData]> {
    const filePath = this.getFilePath(fileName);
    this.logger.debug(`Writing file to: ${filePath}`, 'saveFile');
    await this.ensureDirectory();
    await fs.writeFile(filePath, buffer, null);
    return ['/' + filePath, null];
  }

  async deleteFile(fileName: string, _: BackendData): Promise<void> {
    return await fs.unlink(this.getFilePath(fileName));
  }

  getFileURL(fileName: string, _: BackendData): Promise<string> {
    const filePath = this.getFilePath(fileName);
    // TODO: Add server address to url
    return Promise.resolve('/' + filePath);
  }

  private getFilePath(fileName: string): string {
    return join(this.uploadDirectory, fileName);
  }

  private async ensureDirectory() {
    try {
      await fs.access(this.uploadDirectory);
    } catch (e) {
      await fs.mkdir(this.uploadDirectory);
    }
  }
}
