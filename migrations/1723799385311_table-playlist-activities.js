/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('playlist_activities', {
    id: {
      type: 'SERIAL',
      primaryKey: true,
    },
    playlist_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    user_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    song_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    action: {
      type: 'VARCHAR(10)',
      notNull: true,
    },
    time: {
      type: 'TIMESTAMP WITH TIME ZONE',
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint('playlist_activities', 'fk_playlist_activities_playlist_id', {
    foreignKeys: {
      columns: 'playlist_id',
      references: 'playlists(id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('playlist_activities', 'fk_playlist_activities_user_id', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('playlist_activities', 'fk_playlist_activities_song_id', {
    foreignKeys: {
      columns: 'song_id',
      references: 'songs(id)',
      onDelete: 'CASCADE',
    },
  });
};

exports.down = (pgm) => {
  // Menghapus constraint foreign key dari tabel playlist_activities
  pgm.dropConstraint('playlist_activities', 'fk_playlist_activities_playlist_id');
  pgm.dropConstraint('playlist_activities', 'fk_playlist_activities_user_id');
  pgm.dropConstraint('playlist_activities', 'fk_playlist_activities_song_id');

  // Menghapus tabel playlist_activities
  pgm.dropTable('playlist_activities');
};
