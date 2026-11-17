import assert from 'node:assert/strict';
import test from 'node:test';
import User from '../models/User.js';
import Game from '../models/Game.js';
import Message from '../models/Message.js';
import Room from '../models/Room.js';
import { login, register } from '../controllers/authController.js';
import { joinGame, getRoomGames } from '../controllers/gameController.js';
import { addReaction } from '../controllers/messageController.js';

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('normalizes email addresses during registration and login', async (t) => {
  await t.test('registration checks the normalized email for duplicates', async () => {
    const originalFindOne = User.findOne;
    let query;
    User.findOne = async (value) => {
      query = value;
      return { email: 'test@example.com' };
    };

    try {
      const res = createResponse();
      await register({
        body: { username: 'test-user', email: ' Test@Example.COM ', password: 'secret' }
      }, res);

      assert.equal(query.$or[0].email, 'test@example.com');
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, 'Email already registered');
    } finally {
      User.findOne = originalFindOne;
    }
  });

  await t.test('login queries with a normalized email', async () => {
    const originalFindOne = User.findOne;
    let query;
    User.findOne = (value) => {
      query = value;
      return { select: async () => null };
    };

    try {
      const res = createResponse();
      await login({ body: { email: ' Test@Example.COM ', password: 'secret' } }, res);

      assert.equal(query.email, 'test@example.com');
      assert.equal(res.statusCode, 401);
    } finally {
      User.findOne = originalFindOne;
    }
  });
});

test('game endpoints require room membership', async (t) => {
  const nonMemberRoom = { roomId: 'ROOM1234', members: [{ user: 'member-id' }] };

  await t.test('joining a game denies a non-member before changing game state', async () => {
    const originalFindGame = Game.findById;
    const originalFindRoom = Room.findById;
    Game.findById = async () => ({
      room: 'room-db-id',
      status: 'waiting',
      players: [{ user: 'member-id' }]
    });
    Room.findById = async () => nonMemberRoom;

    try {
      const res = createResponse();
      await joinGame({ params: { gameId: 'game-id' }, user: { _id: 'outsider-id' } }, res);

      assert.equal(res.statusCode, 403);
      assert.equal(res.body.message, 'Not a member of this room');
    } finally {
      Game.findById = originalFindGame;
      Room.findById = originalFindRoom;
    }
  });

  await t.test('listing games denies a non-member before reading games', async () => {
    const originalFindRoom = Room.findOne;
    const originalFindGames = Game.find;
    Room.findOne = async () => nonMemberRoom;
    Game.find = () => {
      throw new Error('Games must not be queried for a non-member');
    };

    try {
      const res = createResponse();
      await getRoomGames({
        params: { roomId: 'ROOM1234' },
        user: { _id: 'outsider-id' }
      }, res);

      assert.equal(res.statusCode, 403);
      assert.equal(res.body.message, 'Not a member of this room');
    } finally {
      Room.findOne = originalFindRoom;
      Game.find = originalFindGames;
    }
  });
});

test('message reactions require room membership', async () => {
  const originalFindMessage = Message.findById;
  const originalFindRoom = Room.findById;
  Message.findById = async () => ({
    room: 'room-db-id',
    reactions: [],
    save: async () => {
      throw new Error('Message must not be changed for a non-member');
    }
  });
  Room.findById = async () => ({
    members: [{ user: 'member-id' }]
  });

  try {
    const res = createResponse();
    await addReaction({
      params: { messageId: 'message-id' },
      body: { emoji: '👍' },
      user: { _id: 'outsider-id' }
    }, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'You are not a member of this room');
  } finally {
    Message.findById = originalFindMessage;
    Room.findById = originalFindRoom;
  }
});
