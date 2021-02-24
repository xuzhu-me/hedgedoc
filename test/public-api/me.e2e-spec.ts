/*
 * SPDX-FileCopyrightText: 2021 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable
@typescript-eslint/no-unsafe-assignment,
@typescript-eslint/no-unsafe-member-access
*/

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { HistoryService } from '../../src/history/history.service';
import { NotesService } from '../../src/notes/notes.service';
import { HistoryEntryUpdateDto } from '../../src/history/history-entry-update.dto';
import { HistoryEntryDto } from '../../src/history/history-entry.dto';
import { HistoryEntry } from '../../src/history/history-entry.entity';
import { UsersService } from '../../src/users/users.service';
import { TokenAuthGuard } from '../../src/auth/token-auth.guard';
import { MockAuthGuard } from '../../src/auth/mock-auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicApiModule } from '../../src/api/public/public-api.module';
import { NotesModule } from '../../src/notes/notes.module';
import { PermissionsModule } from '../../src/permissions/permissions.module';
import { GroupsModule } from '../../src/groups/groups.module';
import { LoggerModule } from '../../src/logger/logger.module';
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { HistoryModule } from '../../src/history/history.module';
import { ConfigModule } from '@nestjs/config';
import mediaConfigMock from '../../src/config/media.config.mock';
import { User } from '../../src/users/user.entity';

// TODO Tests have to be reworked using UserService functions

describe('Notes', () => {
  let app: INestApplication;
  let historyService: HistoryService;
  let notesService: NotesService;
  let userService: UsersService;
  let user: User;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [mediaConfigMock],
        }),
        PublicApiModule,
        NotesModule,
        PermissionsModule,
        GroupsModule,
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: './hedgedoc-e2e-me.sqlite',
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        LoggerModule,
        AuthModule,
        UsersModule,
        HistoryModule,
      ],
    })
      .overrideGuard(TokenAuthGuard)
      .useClass(MockAuthGuard)
      .compile();
    app = moduleRef.createNestApplication();
    notesService = moduleRef.get(NotesService);
    historyService = moduleRef.get(HistoryService);
    userService = moduleRef.get(UsersService);
    user = await userService.createUser('hardcoded', 'Testy');
    await app.init();
  });

  it(`GET /me`, async () => {
    const userInfo = userService.toUserDto(user);
    const response = await request(app.getHttpServer())
      .get('/me')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(response.body).toEqual(userInfo);
  });

  it(`GET /me/history`, async () => {
    const noteName = 'testGetNoteHistory1';
    const note = await notesService.createNote('', noteName);
    const createdHistoryEntry = await historyService.createOrUpdateHistoryEntry(
      note,
      user,
    );
    const response = await request(app.getHttpServer())
      .get('/me/history')
      .expect('Content-Type', /json/)
      .expect(200);
    const history = <HistoryEntryDto[]>response.body;
    for (const historyEntry of history) {
      if (historyEntry.identifier === 'testGetHistory') {
        expect(historyEntry).toEqual(createdHistoryEntry);
      }
    }
  });

  it(`PUT /me/history/{note}`, async () => {
    const noteName = 'testGetNoteHistory2';
    const note = await notesService.createNote('', noteName);
    await historyService.createOrUpdateHistoryEntry(note, user);
    const historyEntryUpdateDto = new HistoryEntryUpdateDto();
    historyEntryUpdateDto.pinStatus = true;
    const response = await request(app.getHttpServer())
      .put('/me/history/' + noteName)
      .send(historyEntryUpdateDto)
      .expect(200);
    const history = await historyService.getEntriesByUser(user);
    let historyEntry: HistoryEntryDto = response.body;
    expect(historyEntry.pinStatus).toEqual(true);
    historyEntry = null;
    for (const e of history) {
      if (e.note.alias === noteName) {
        historyEntry = historyService.toHistoryEntryDto(e);
      }
    }
    expect(historyEntry.pinStatus).toEqual(true);
  });

  it(`DELETE /me/history/{note}`, async () => {
    const noteName = 'testGetNoteHistory3';
    const note = await notesService.createNote('', noteName);
    await historyService.createOrUpdateHistoryEntry(note, user);
    const response = await request(app.getHttpServer())
      .delete(`/me/history/${noteName}`)
      .expect(204);
    expect(response.body).toEqual({});
    const history = await historyService.getEntriesByUser(user);
    let historyEntry: HistoryEntry = null;
    for (const e of history) {
      if (e.note.alias === noteName) {
        historyEntry = e;
      }
    }
    return expect(historyEntry).toBeNull();
  });

  it.skip(`GET /me/notes/`, async () => {
    // TODO use function from HistoryService to add an History Entry
    await notesService.createNote('This is a test note.', 'test7');
    // usersService.getALLNotesOwnedByUser() TODO Implement function
    const response = await request(app.getHttpServer())
      .get('/me/notes/')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(response.body.revisions).toHaveLength(1);
  });

  afterAll(async () => {
    await app.close();
  });
});
