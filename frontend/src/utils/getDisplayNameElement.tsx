import { type JSXNode } from '@builder.io/qwik'
import { type Account } from '~/types'

export function getDisplayNameElement(account: Account): JSXNode {
	return (
		<>
			{account.display_name.split(/(:[^\s:]+:)/g).map((str) => {
				const customEmojiMatch = str.match(/^:([^\s:]+):$/)
				if (customEmojiMatch) {
					const shortCode = customEmojiMatch[1]
					const customEmojiInfo = account.emojis.find((emoji) => emoji.shortcode === shortCode)
					if (customEmojiInfo) {
						// eslint-disable-next-line qwik/single-jsx-root
						return <img class="custom-emoji" src={customEmojiInfo.url} alt={`:${shortCode}:`}></img>
					}
				}
				return <>{str}</>
			})}
		</>
	)
}
