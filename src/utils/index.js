const mapDBToModelSongs = ({
  id, title, performer,
}) => ({
  id,
  title,
  performer,
});
const mapDBToModelPlaylists = ({
  id, name, owner,
}) => ({
  id,
  name,
  username: owner,
});

module.exports = { mapDBToModelSongs, mapDBToModelPlaylists };
