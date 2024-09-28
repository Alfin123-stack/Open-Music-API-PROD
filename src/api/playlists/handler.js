const autoBind = require('auto-bind');

class PlaylistsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePostPlaylistPayload(request.payload);
    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;
    const { username } = await this._service.getUserById(credentialId);

    const playlistId = await this._service.addPlaylist({ name, owner: username });

    const response = h.response({
      status: 'success',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request, h) {
    const { id: credentialId } = request.auth.credentials;
    const { username } = await this._service.getUserById(credentialId);
    const playlists = await this._service.getPlaylists(username);
    const response = h.response({
      status: 'success',
      data: {
        playlists: playlists.playlistsOwner,
      },
    });

    response.header('X-Data-Source', playlists.source);
    response.code(200);
    return response;
  }

  async deletePlaylistByIdHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistOwner(id, credentialId);
    await this._service.deletePlaylistById(id);

    const response = h.response({
      status: 'success',
      message: 'Berhasil menghapus Playlist',
    });

    response.code(200);
    return response;
  }

  async postSongToPlaylistHandler(request, h) {
    this._validator.validatePostSongToPlaylistPayload(request.payload);
    const { songId } = request.payload;
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifySong(songId);
    await this._service.verifyPlaylistAccess(id, credentialId);
    await this._service.addSongToPlaylist({ playlistId: id, songId, userId: credentialId });

    const response = h.response({
      status: 'success',
      message: 'lagu berhasil ditambahkan ke playlist',
    });
    response.code(201);
    return response;
  }

  async getSongsFromPlaylistHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess(id, credentialId);
    const playlist = await this._service.getSongsFromPlaylist(id);
    const response = h.response({
      status: 'success',
      data: {
        playlist: playlist.playlistSongs,
      },
    });

    response.header('X-Data-Source', playlist.source);
    response.code(200);
    return response;
  }

  async deleteSongFromPlaylistByIdHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    const { songId } = request.payload;

    await this._service.verifyPlaylistAccess(id, credentialId);
    await this._service.deleteSongFromPlaylistById({
      playlistId: id,
      songId,
      userId: credentialId,

    });

    const response = h.response({
      status: 'success',
      message: 'Berhasil menghapus Playlist',
    });

    response.code(200);
    return response;
  }

  async getPlaylistActivitiesHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistOwner(id, credentialId);
    const activities = await this._service.getPlaylistActivities(id);

    const response = h.response({
      status: 'success',
      data: {
        playlistId: id,
        activities: activities.map((activity) => ({
          username: activity.username,
          title: activity.title,
          action: activity.action,
          time: activity.time,
        })),
      },
    });

    response.code(200);
    return response;
  }
}

module.exports = PlaylistsHandler;
