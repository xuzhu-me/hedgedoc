/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import mediaConfiguration from '../../config/media.config';
import { ConsoleLoggerService } from '../../logger/console-logger.service';
import { MediaBackend } from '../media-backend.interface';
import { BackendData } from '../media-upload.entity';
import { MediaConfig } from '../../config/media.config';
import { Client } from 'minio';
import { BackendType } from './backend-type.enum';

@Injectable()
export class S3Backend implements MediaBackend {
  private config: MediaConfig['backend']['s3'];
  private client: Client;

  constructor(
    private readonly logger: ConsoleLoggerService,
    @Inject(mediaConfiguration.KEY)
    private mediaConfig: MediaConfig,
  ) {
    this.logger.setContext(S3Backend.name);
    if (mediaConfig.backend.use === BackendType.S3) {
      this.config = mediaConfig.backend.s3;
      this.client = new Client({
        endPoint: this.config.endPoint,
        port: this.config.port,
        useSSL: this.config.secure,
        accessKey: this.config.accessKeyId,
        secretKey: this.config.secretAccessKey,
      });
    }
  }

  async saveFile(
    buffer: Buffer,
    fileName: string,
  ): Promise<[string, BackendData]> {
    try {
      await this.client.putObject(this.config.bucket, fileName, buffer);
      this.logger.log(`Uploaded file ${fileName}`, 'saveFile');
      return [this.getUrl(fileName), null];
    } catch (e) {
      this.logger.error(e.message, e.stack, 'saveFile');
    }
  }

  async deleteFile(fileName: string, _: BackendData): Promise<void> {
    try {
      await this.client.removeObject(this.config.bucket, fileName);
      this.logger.log(`Removed file ${fileName}`, 'saveFile');
      return;
    } catch (e) {
      this.logger.error(e.message, e.stack, 'saveFile');
    }
  }

  getFileURL(fileName: string, _: BackendData): Promise<string> {
    return Promise.resolve(this.getUrl(fileName));
  }

  private getUrl(fileName: string): string {
    const protocol = this.config.secure ? 'https' : 'http';
    const bucket = this.config.bucket;
    let domain = this.config.endPoint;
    if (
      (this.config.port !== 80 && !this.config.secure) ||
      (this.config.port !== 443 && this.config.secure)
    ) {
      domain += `:${this.config.port}`;
    }
    return `${protocol}://${domain}/${bucket}/${fileName}`;
  }
}
