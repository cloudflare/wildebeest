import errorHtml from './error-raw.html?raw'

const defaultErrorMessage = 'An error occurred, please try again later'

export function getErrorHtml(errorMessage = defaultErrorMessage) {
	return errorHtml.replace(/{{\s*errorMessage\s*}}/, errorMessage)
}
