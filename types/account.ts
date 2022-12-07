// https://docs.joinmastodon.org/entities/Account/

export type MastodonAccount = {
  id: string,
  username: string,
  acct: string,
  display_name: string

  avatar: string,
  avatar_static: string,

  header: string,
  header_static: string,
};
