const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const { mapDBToModelPlaylists } = require('../../utils');

class PlaylistsService {
  constructor(collaborationService, cacheService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
    this._cacheService = cacheService;
  }

  async getUserById(userId) {
    const query = {
      text: 'SELECT username FROM users WHERE id = $1',
      values: [userId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('User tidak ditemukan');
    }

    return result.rows[0];
  }

  async _getUserId(owner) {
    const queryUser = {
      text: 'SELECT * FROM users WHERE username = $1',
      values: [owner],
    };

    const resultUser = await this._pool.query(queryUser);
    const userId = resultUser.rows[0].id;

    return userId;
  }

  async addPlaylist({ name, owner }) {
    const id = nanoid(16);
    const idPlaylist = `playlist-${id}`;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [idPlaylist, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    const userId = await this._getUserId(owner);

    await this._cacheService.delete(`playlists:${userId}`);

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const userCollab = await this._getUserId(owner);
    try {
      const result = await this._cacheService.get(`playlists:${userCollab}`);
      return {
        playlistsOwner: JSON.parse(result),
        source: 'cache',
      };
    } catch (error) {
      const query = {
        text: `SELECT playlists.* FROM playlists
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      WHERE playlists.owner = $1 OR collaborations.user_id = $2
      GROUP BY playlists.id`,
        values: [owner, userCollab],
      };

      const result = await this._pool.query(query);
      const mappedResult = result.rows.map(mapDBToModelPlaylists);

      await this._cacheService.set(`playlists:${userCollab}`, JSON.stringify(mappedResult));

      return {
        playlistsOwner: mappedResult,
        source: 'database',
      };
    }
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id, owner',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }

    const { owner } = result.rows[0];

    const userId = await this._getUserId(owner);

    await this._cacheService.delete(`playlists:${userId}`);
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };
    const queryUser = {
      text: 'SELECT * FROM users WHERE id = $1',
      values: [owner],
    };
    const result = await this._pool.query(query);
    const resultUser = await this._pool.query(queryUser);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
    if (!resultUser.rows.length) {
      throw new NotFoundError('User tidak ditemukan');
    }
    const playlist = result.rows[0];
    const user = resultUser.rows[0];
    if (playlist.owner !== user.username) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }

  async verifySong(id) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Song tidak ditemukan');
    }
  }

  // addSongToPlaylist,getSongsFromPlaylist,deleteSongFromPlaylistById

  async addSongToPlaylist({ playlistId, songId, userId }) {
    const query = {
      text: 'INSERT INTO playlist_songs (playlist_id, song_id) VALUES($1, $2) RETURNING playlist_id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].playlist_id) {
      throw new NotFoundError('Lagu gagal ditambahkan ke playlist');
    }

    await this.logActivity({
      playlistId,
      userId,
      songId,
      action: 'add',
    });

    await this._cacheService.delete(`playlistSongs:${playlistId}`);

    return result.rows[0];
  }

  async getSongsFromPlaylist(playlistId) {
    try {
      const result = await this._cacheService.get(`playlistSongs:${playlistId}`);
      return {
        playlistSongs: JSON.parse(result),
        source: 'cache',
      };
    } catch (error) {
      const query = {
        text: `SELECT 
          playlists.id, 
          playlists.name, 
          playlists.owner, 
          songs.id as song_id, 
          songs.title, 
          songs.performer
          FROM playlists
          LEFT JOIN playlist_songs ON playlist_songs.playlist_id = playlists.id
          LEFT JOIN songs ON playlist_songs.song_id = songs.id
          WHERE playlists.id = $1`,
        values: [playlistId],
      };
      const result = await this._pool.query(query);
      if (!result.rows.length) {
        throw new NotFoundError('Playlist tidak ditemukan');
      }

      // Structure the result correctly
      const playlistData = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        username: result.rows[0].owner,
        songs: result.rows.map((songRow) => ({
          id: songRow.song_id,
          title: songRow.title,
          performer: songRow.performer,
        })),
      };

      await this._cacheService.set(`playlistSongs:${playlistId}`, JSON.stringify(playlistData));

      return {
        playlistSongs: playlistData,
        source: 'database',
      };
    }
  }

  async deleteSongFromPlaylistById({
    playlistId, songId, userId,
  }) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING playlist_id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError('Lagu gagal dihapus dari playlist. Id tidak ditemukan');
    }

    await this.logActivity({
      playlistId,
      userId,
      songId,
      action: 'delete',
    });
    await this._cacheService.delete(`playlistSongs:${playlistId}`);

    return result.rows[0];
  }

  async logActivity({
    playlistId, userId, songId, action,
  }) {
    const query = {
      text: 'INSERT INTO playlist_activities (playlist_id, user_id, song_id, action) VALUES ($1, $2, $3, $4)',
      values: [playlistId, userId, songId, action],
    };

    await this._pool.query(query);
  }

  async getPlaylistActivities(playlistId) {
    const query = {
      text: `SELECT users.username, songs.title, action, time
             FROM playlist_activities
             JOIN users ON playlist_activities.user_id = users.id
             JOIN songs ON playlist_activities.song_id = songs.id
             WHERE playlist_id = $1
             ORDER BY time`,
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist acitivities tidak ditemukan');
    }

    return result.rows;
  }
}

module.exports = PlaylistsService;
