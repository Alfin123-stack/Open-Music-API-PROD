/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('playlist_songs', {
    playlist_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    song_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
  }, {
    primaryKey: ['playlist_id', 'song_id'],
  });

  pgm.addConstraint('playlist_songs', 'fk_playlist_songs_playlist_id', {
    foreignKeys: {
      columns: 'playlist_id',
      references: 'playlists(id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('playlist_songs', 'fk_playlist_songs_song_id', {
    foreignKeys: {
      columns: 'song_id',
      references: 'songs(id)',
      onDelete: 'CASCADE',
    },
  });
};

exports.down = (pgm) => {
  // Menghapus constraint foreign key dari tabel playlist_songs
  pgm.dropConstraint('playlist_songs', 'fk_playlist_songs_playlist_id');
  pgm.dropConstraint('playlist_songs', 'fk_playlist_songs_song_id');

  // Menghapus tabel playlist_songs
  pgm.dropTable('playlist_songs');
};
