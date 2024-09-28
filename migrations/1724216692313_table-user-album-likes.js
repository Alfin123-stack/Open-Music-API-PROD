/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('user_album_likes', {
    id: {
      type: 'SERIAL',
      primaryKey: true,
    },
    user_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    album_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
  });

  // Menambahkan primary key pada kombinasi kolom user_id dan album_id
  pgm.addConstraint('user_album_likes', 'unique_user_album_like', {
    unique: ['user_id', 'album_id'],
  });

  // Menambahkan constraint foreign key untuk user_id
  pgm.addConstraint('user_album_likes', 'fk_user_album_likes_user_id', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  // Menambahkan constraint foreign key untuk album_id
  pgm.addConstraint('user_album_likes', 'fk_user_album_likes_album_id', {
    foreignKeys: {
      columns: 'album_id',
      references: 'albums(id)',
      onDelete: 'CASCADE',
    },
  });
};

exports.down = (pgm) => {
  // Menghapus constraint foreign key dari tabel user_album_likes
  pgm.dropConstraint('user_album_likes', 'fk_user_album_likes_user_id');
  pgm.dropConstraint('user_album_likes', 'fk_user_album_likes_album_id');

  // Menghapus tabel user_album_likes
  pgm.dropTable('user_album_likes');
};
