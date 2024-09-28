const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const ClientError = require('../../exceptions/ClientError');

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = nanoid(16);
    const idAlbum = `album-${id}`;

    const query = {
      text: 'INSERT INTO albums (id, name, year) VALUES($1, $2, $3) RETURNING id',
      values: [idAlbum, name, year],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new InvariantError('Album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async addAlbumCover(id, coverUrl) {
    const query = {
      text: 'UPDATE albums SET coverUrl = $2 WHERE id = $1 RETURNING id',
      values: [id, coverUrl],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new InvariantError('Cover Album gagal ditambahkan');
    }
  }

  async getAlbumById(id) {
    const query = `
      SELECT
        albums.id AS album_id,
        albums.name AS album_name,
        albums.year AS album_year,
        albums.coverurl AS album_cover_url,
        songs.id AS song_id,
        songs.title AS song_title,
        songs.performer AS song_performer
      FROM albums
      LEFT JOIN songs ON albums.id = songs.albumid
      WHERE albums.id = $1;
    `;

    const result = await this._pool.query({
      text: query,
      values: [id],
    });

    if (result.rowCount === 0) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    const { rows } = result;

    // Mengelompokkan lagu berdasarkan album
    const album = {
      id: rows[0].album_id,
      name: rows[0].album_name,
      year: rows[0].album_year,
      coverUrl: rows[0].album_cover_url,
      songs: [],
    };

    rows.forEach((row) => {
      if (row.song_id) {
        album.songs.push({
          id: row.song_id,
          title: row.song_title,
          performer: row.song_performer,
        });
      }
    });

    return album;
  }

  async editAlbumById(id, { name, year }) {
    const query = {
      text: 'UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id',
      values: [name, year, id],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new NotFoundError('Gagal memperbarui Album. Id tidak ditemukan');
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan');
    }
  }

  async checkAlbumLike(userId, albumId) {
    const query = {
      text: 'SELECT * FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId],
    };
    const result = await this._pool.query(query);

    if (result.rowCount > 0) {
      throw new ClientError('Album ini telah anda sukai');
    }
  }

  async addAlbumLike(userId, albumId) {
    const query = {
      text: 'INSERT INTO user_album_likes (user_id, album_id) VALUES ($1, $2)',
      values: [userId, albumId],
    };
    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new InvariantError('Album like gagal ditambahkan');
    }

    // Hapus cache setelah menambahkan like
    await this._cacheService.delete(`albums:${albumId}`);
  }

  async removeAlbumLike(userId, albumId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId],
    };
    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new NotFoundError('Album like gagal dihapus');
    }
    // Hapus cache setelah menghapus like
    await this._cacheService.delete(`albums:${albumId}`);
  }

  async getAlbumLikeCount(albumId) {
    try {
      const result = await this._cacheService.get(`albums:${albumId}`);
      return {
        count: parseInt(result, 10),
        source: 'cache',
      };
    } catch (error) {
      const query = {
        text: 'SELECT COUNT(*) FROM user_album_likes WHERE album_id = $1',
        values: [albumId],
      };
      const result = await this._pool.query(query);
      const countLikes = parseInt(result.rows[0].count, 10);
      await this._cacheService.set(`albums:${albumId}`, countLikes.toString());

      return {
        count: countLikes,
        source: 'database',
      };
    }
  }
}

module.exports = AlbumsService;
