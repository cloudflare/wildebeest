import type { MastodonAccount } from 'wildebeest/types/account'
import type { Person } from 'wildebeest/activitypub/actors'

export type ContextData = {
    // MastodonAccount object of the logged in user
    connectedUser: MastodonAccount
    // ActivityPub Person object of the logged in user
    connectedActor: Person
}
