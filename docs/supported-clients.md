[Index](../README.md) ┊ [Back](access-policy.md) ┊ [Updating Wildebeest](updating.md)

## Supported Clients

Wildebeest is Mastodon API compatible, which means that you should be able to use most of the Web, Desktop, and Mobile clients with it. However, this project is a work in progress, and nuances might affect some of their functionality.

This is the list clients that we have been using successfully while developing and testing Wildebeest:

| Client                | Type    | Oauth | Text | Images | Search | Notifs | Edit<br>profile | Source       | Works?
| :-------------------- | :------ | :---- | :--- | :----- | :----- | :----- | :-----------    | :----------- | :---
| [Pinafore][1]         | Web     | yes   | yes  | yes    | yes    | yes    | n/a             | [github][2]  | ✅ <sup>1</sup>
| [Mastodon Android][4] | Mobile  | yes   | yes  | yes    | yes    | yes    | yes             | [github][5]  | ✅
| [Mastodon iOS][3]     | Mobile  | yes   | yes  | yes    | yes    | yes    | yes             | [github][6]  | ✅
| [Ivory for iOS][7]    | Mobile  | yes   | ?    | ?      | ?      | ?      | ?               | n/a          | ❌ <sup>2</sup>
| [Elk][8]              | Web     | yes   | yes  | yes    | yes    | yes    | yes             | [github][9]  | ✅ <sup>3</sup>
| [Tooot][10]           | Mobile  | yes   | yes  | yes    | yes    | yes    | n/a             | [github][11] | ✅ <sup>3</sup>
| [Mammoth][12]         | Mobile  | yes   | yes  | yes    | yes    | yes    | n/a             | n/a          | ✅ <sup>3</sup> <sup>4</sup>

<sup>1</sup> [client is unmaintained][pinafore-unmaintained]<br/>
<sup>2</sup> we know what the issue is and are in contact with the author<br/>
<sup>3</sup> [conversations][conversations], [favourites][favorites], [bookmarks][bookmarks] and [trends][trends] are not implemented yet<br/>
<sup>4</sup> notification filters are broken

Wildebeest also provides a read-only web client in your instance URL, where you can explore the timelines (local and federated), posts and profiles. Please use the existing Mastodon clients to post and manage your account.

[Index](../README.md) ┊ [Back](access-policy.md) ┊ [Updating Wildebeest](updating.md)

[1]: https://pinafore.social/
[2]: https://github.com/nolanlawson/pinafore
[3]: https://apps.apple.com/us/app/mastodon-for-iphone/id1571998974
[4]: https://play.google.com/store/apps/details?id=org.joinmastodon.android
[5]: https://github.com/mastodon/mastodon-android
[6]: https://github.com/mastodon/mastodon-ios
[7]: https://tapbots.com/ivory/
[8]: https://elk.zone/
[9]: https://github.com/elk-zone/elk
[10]: https://tooot.app/
[11]: https://github.com/tooot-app
[12]: https://testflight.apple.com/join/66c1wW8y
[favorites]: https://docs.joinmastodon.org/methods/favourites/
[bookmarks]: https://docs.joinmastodon.org/methods/bookmarks/
[trends]: https://docs.joinmastodon.org/methods/trends/
[conversations]: https://docs.joinmastodon.org/methods/conversations/
[pinafore-unmaintained]: https://nolanlawson.com/2023/01/09/retiring-pinafore/
