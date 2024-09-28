/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('collaborations', {
    id: {
      type: 'VARCHAR(50)',
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
  });

  pgm.addConstraint('collaborations', 'unique_playlist_id_and_user_id', 'UNIQUE(playlist_id, user_id)');

  pgm.addConstraint('collaborations', 'fk_collaborations_playlist_id', {
    foreignKeys: {
      columns: 'playlist_id',
      references: 'playlists(id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('collaborations', 'fk_collaborations_user_id', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });
};

exports.down = (pgm) => {
  // Menghapus constraint foreign key dari tabel collaborations
  pgm.dropConstraint('collaborations', 'fk_collaborations_playlist_id');
  pgm.dropConstraint('collaborations', 'fk_collaborations_user_id');

  // Menghapus constraint unique
  pgm.dropConstraint('collaborations', 'unique_playlist_id_and_user_id');

  // Menghapus tabel collaborations
  pgm.dropTable('collaborations');
};
