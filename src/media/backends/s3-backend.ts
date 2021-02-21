/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import mediaConfiguration from '../../config/media.config';
import { ConsoleLoggerService } from '../../logger/console-logger.service';
import { MediaBackend } from '../media-backend.interface';
import { BackendData } from '../media-upload.entity';
import { MediaConfig } from '../../config/media.config';
import * as AWS from '@aws-sdk/client-s3';

@Injectable()
export class S3Backend implements MediaBackend {
  private config: MediaConfig['backend']['s3'];
  // private client: S3Client;

  constructor(
    private readonly logger: ConsoleLoggerService,
    @Inject(mediaConfiguration.KEY)
    private mediaConfig: MediaConfig,
  ) {
    this.logger.setContext(S3Backend.name);
    this.config = mediaConfig.backend.s3;
    // this.client =
  }

  async saveFile(_: Buffer, __: string): Promise<[string, BackendData]> {
    // const body = buffer.toString();
    const client = new AWS.S3({
      endpoint: 'http://localhost:9000', // this.config.endPoint,
      region: 'us-east-1', // this.config.region,
      credentials: {
        secretAccessKey: 'minioadmin', // this.config.secretAccessKey,
        accessKeyId: 'minioadmin', // this.config.accessKeyId,
      },
    });
    const fileBuffer = await fs.readFile('test/public-api/fixtures/test.png');
    const params = {
      Bucket: 'test',
      Key: 'test.png',
      Body: fileBuffer,
    };
    // const command = new PutObjectCommand(params);
    try {
      const result = await client.putObject(params);
      this.logger.log(`send Command ${result}`, 'saveFile');
      return ['', null];
    } catch (e) {
      this.logger.error(`error: ${e.message}`, e.stack, 'saveFile');
    }
  }

  async deleteFile(__: string, _: BackendData): Promise<void> {
    return;
  }

  getFileURL(fileName: string, _: BackendData): Promise<string> {
    return Promise.resolve('/' + fileName);
  }
}
