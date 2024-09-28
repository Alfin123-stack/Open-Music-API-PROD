const autoBind = require('auto-bind');

class AlbumsHandler {
  constructor(service, storageService, validator) {
    this._service = service;
    this._storageService = storageService;
    this._validator = validator;

    autoBind(this);
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;

    const albumId = await this._service.addAlbum({ name, year });

    const response = h.response({
      status: 'success',
      data: {
        albumId,
      },
    });
    response.code(201);
    return response;
  }

  async getAlbumByIdHandler(request, h) {
    const { id } = request.params;
    const album = await this._service.getAlbumById(id);
    const response = h.response({
      status: 'success',
      data: {
        album,
      },
    });

    response.code(200);
    return response;
  }

  async putAlbumByIdHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { id } = request.params;
    const { name, year } = request.payload; // Perhatikan: tambahkan 'songs' jika diperlukan

    await this._service.editAlbumById(id, { name, year });

    const response = h.response({
      status: 'success',
      message: 'Berhasil merubah album',
    });

    response.code(200);
    return response;
  }

  async deleteAlbumByIdHandler(request, h) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);

    const response = h.response({
      status: 'success',
      message: 'Berhasil menghapus album',
    });

    response.code(200);
    return response;
  }

  async postUploadAlbumCoverHandler(request, h) {
    const { cover } = request.payload;
    const { id } = request.params;

    // Validasi tipe dan ukuran file
    this._validator.validateCoverHeaders(cover.hapi.headers);

    // Menyimpan file
    const filename = await this._storageService.writeFile(cover, cover.hapi);
    const coverUrl = `http://${process.env.HOST}:${process.env.PORT}/album/covers/${filename}`;

    // Memperbarui URL cover di database
    await this._service.addAlbumCover(id, coverUrl);

    // Mengembalikan respons
    const response = h.response({
      status: 'success',
      message: 'Sampul berhasil diunggah',
    });
    response.code(201);
    return response;
  }

  // postLikedAlbumHandler, deleteLikedAlbumByIdHandler, getLikedAlbumByIdHandler

  async postLikedAlbumHandler(request, h) {
    const { id } = request.params;
    const userId = request.auth.credentials.id;

    await this._service.getAlbumById(id);

    await this._service.checkAlbumLike(userId, id);
    // Tambah like ke database
    await this._service.addAlbumLike(userId, id);

    const response = h.response({
      status: 'success',
      message: 'Album berhasil disukai',
    });
    response.code(201);
    return response;
  }

  async deleteLikedAlbumByIdHandler(request, h) {
    const { id } = request.params;
    const userId = request.auth.credentials.id;

    await this._service.getAlbumById(id);
    await this._service.removeAlbumLike(userId, id);

    const response = h.response({
      status: 'success',
      message: 'Album berhasil batal disukai',
    });
    response.code(200);
    return response;
  }

  async getLikedAlbumByIdHandler(request, h) {
    const { id } = request.params;

    const likeCount = await this._service.getAlbumLikeCount(id);

    const response = h.response({
      status: 'success',
      data: {
        likes: likeCount.count,
      },
    });
    // Menambahkan custom header untuk menunjukkan sumber data
    response.header('X-Data-Source', likeCount.source);

    response.code(200);
    return response;
  }
}

module.exports = AlbumsHandler;
