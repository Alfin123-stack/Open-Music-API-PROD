exports.up = (pgm) => {
  // Membuat tabel albums terlebih dahulu
  pgm.createTable('albums', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    name: {
      type: 'TEXT',
      notNull: true,
    },
    year: {
      type: 'INTEGER',
      notNull: true,
    },
    coverurl: {
      type: 'TEXT',
      default: null,
    },
  });

  // Membuat tabel songs setelah tabel albums
  pgm.createTable('songs', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    title: {
      type: 'TEXT',
      notNull: true,
    },
    year: {
      type: 'INTEGER',
      notNull: true,
    },
    genre: {
      type: 'TEXT',
      notNull: true,
    },
    performer: {
      type: 'TEXT',
      notNull: true,
    },
    duration: {
      type: 'INTEGER',
    },
    albumid: {
      type: 'VARCHAR(50)',
      references: 'albums(id)', // Menambahkan foreign key constraint
      onDelete: 'SET NULL', // Menentukan tindakan saat referensi dihapus
    },
  });
};

exports.down = (pgm) => {
  // Hapus tabel songs terlebih dahulu
  pgm.dropTable('songs');

  // Hapus tabel albums
  pgm.dropTable('albums');
};
