import { RequestHandler } from '@builder.io/qwik-city'

export const onGet: RequestHandler = ({ response }) => {
	throw response.redirect('/explore/')
}
