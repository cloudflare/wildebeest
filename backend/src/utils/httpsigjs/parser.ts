// Copyright 2012 Joyent, Inc.  All rights reserved.

import { HEADER, HttpSignatureError, InvalidAlgorithmError, validateAlgorithm } from './utils'

///--- Globals

const State = {
	New: 0,
	Params: 1,
}

const ParamsState = {
	Name: 0,
	Quote: 1,
	Value: 2,
	Comma: 3,
	Number: 4,
}

///--- Specific Errors

class ExpiredRequestError extends HttpSignatureError {
	constructor(message: string) {
		super(message, ExpiredRequestError)
	}
}

class InvalidHeaderError extends HttpSignatureError {
	constructor(message: string) {
		super(message, InvalidHeaderError)
	}
}

class InvalidParamsError extends HttpSignatureError {
	constructor(message: string) {
		super(message, InvalidParamsError)
	}
}

class MissingHeaderError extends HttpSignatureError {
	constructor(message: string) {
		super(message, MissingHeaderError)
	}
}

class StrictParsingError extends HttpSignatureError {
	constructor(message: string) {
		super(message, StrictParsingError)
	}
}

type Options = {
	clockSkew: number
	headers: string[]
	strict: boolean
}

export type ParsedSignature = {
	signature: string
	keyId: string
	signingString: string
	algorithm: string
	scheme: string
	params: Record<string, string | string[] | number>
	opaque: string
}

///--- Exported API

/**
 * Parses the 'Authorization' header out of an http.ServerRequest object.
 *
 * Note that this API will fully validate the Authorization header, and throw
 * on any error.  It will not however check the signature, or the keyId format
 * as those are specific to your environment.  You can use the options object
 * to pass in extra constraints.
 *
 * As a response object you can expect this:
 *
 *     {
 *       "scheme": "Signature",
 *       "params": {
 *         "keyId": "foo",
 *         "algorithm": "rsa-sha256",
 *         "headers": [
 *           "date" or "x-date",
 *           "digest"
 *         ],
 *         "signature": "base64"
 *       },
 *       "signingString": "ready to be passed to crypto.verify()"
 *     }
 *
 * @param {Object} request an http.ServerRequest.
 * @param {Object} options an optional options object with:
 *                   - clockSkew: allowed clock skew in seconds (default 300).
 *                   - headers: required header names (def: date or x-date)
 *                   - strict: should enforce latest spec parsing
 *                             (default: false).
 * @return {Object} parsed out object (see above).
 * @throws {TypeError} on invalid input.
 * @throws {InvalidHeaderError} on an invalid Authorization header error.
 * @throws {InvalidParamsError} if the params in the scheme are invalid.
 * @throws {MissingHeaderError} if the params indicate a header not present,
 *                              either in the request headers from the params,
 *                              or not in the params from a required header
 *                              in options.
 * @throws {StrictParsingError} if old attributes are used in strict parsing
 *                              mode.
 * @throws {ExpiredRequestError} if the value of date or x-date exceeds skew.
 */
export function parseRequest(request: Request, options?: Options): ParsedSignature {
	if (options === undefined) {
		options = {
			clockSkew: 300,
			headers: ['host', '(request-target)'],
			strict: false,
		}
	}

	if (request.method == 'POST') {
		options.headers.push('digest')
	}

	let headers = [request.headers.has('x-date') ? 'x-date' : 'date']
	if (options.headers !== undefined) {
		headers = options.headers
	}

	const authz = request.headers.get(HEADER.AUTH) || request.headers.get(HEADER.SIG)

	if (!authz) {
		const errHeader = HEADER.AUTH + ' or ' + HEADER.SIG

		throw new MissingHeaderError('no ' + errHeader + ' header ' + 'present in the request')
	}

	options.clockSkew = options.clockSkew || 300

	let i = 0
	let state = authz === request.headers.get(HEADER.SIG) ? State.Params : State.New
	let substate = ParamsState.Name
	let tmpName = ''
	let tmpValue = ''

	const parsed: ParsedSignature = {
		scheme: authz === request.headers.get(HEADER.SIG) ? 'Signature' : '',
		params: {},
		signingString: '',
		signature: '',
		keyId: '',
		algorithm: '',
		opaque: '',
	}

	for (i = 0; i < authz.length; i++) {
		const c = authz.charAt(i)
		let code = c.charCodeAt(0)

		switch (Number(state)) {
			case State.New:
				if (c !== ' ') parsed.scheme += c
				else state = State.Params
				break

			case State.Params:
				switch (Number(substate)) {
					case ParamsState.Name:
						// restricted name of A-Z / a-z
						if (
							(code >= 0x41 && code <= 0x5a) || // A-Z
							(code >= 0x61 && code <= 0x7a)
						) {
							// a-z
							tmpName += c
						} else if (c === '=') {
							if (tmpName.length === 0) throw new InvalidHeaderError('bad param format')
							substate = ParamsState.Quote
						} else {
							throw new InvalidHeaderError('bad param format')
						}
						break

					case ParamsState.Quote:
						if (c === '"') {
							tmpValue = ''
							substate = ParamsState.Value
						} else {
							//number
							substate = ParamsState.Number
							code = c.charCodeAt(0)
							if (code < 0x30 || code > 0x39) {
								//character not in 0-9
								throw new InvalidHeaderError('bad param format')
							}
							tmpValue = c
						}
						break

					case ParamsState.Value:
						if (c === '"') {
							parsed.params[tmpName] = tmpValue
							substate = ParamsState.Comma
						} else {
							tmpValue += c
						}
						break

					case ParamsState.Number:
						if (c === ',') {
							parsed.params[tmpName] = parseInt(tmpValue, 10)
							tmpName = ''
							substate = ParamsState.Name
						} else {
							code = c.charCodeAt(0)
							if (code < 0x30 || code > 0x39) {
								//character not in 0-9
								throw new InvalidHeaderError('bad param format')
							}
							tmpValue += c
						}
						break

					case ParamsState.Comma:
						if (c === ',') {
							tmpName = ''
							substate = ParamsState.Name
						} else {
							throw new InvalidHeaderError('bad param format')
						}
						break

					default:
						throw new Error('Invalid substate')
				}
				break

			default:
				throw new Error('Invalid substate')
		}
	}

	let parsedHeaders: string[] = []

	if (!parsed.params.headers || parsed.params.headers === '') {
		if (request.headers.has('x-date')) {
			parsedHeaders = ['x-date']
		} else {
			parsedHeaders = ['date']
		}
	} else if (typeof parsed.params.headers === 'string') {
		parsedHeaders = parsed.params.headers.split(' ')
	}

	// Minimally validate the parsed object
	if (!parsed.scheme || parsed.scheme !== 'Signature') throw new InvalidHeaderError('scheme was not "Signature"')

	if (!parsed.params.keyId) throw new InvalidHeaderError('keyId was not specified')

	if (!parsed.params.algorithm) throw new InvalidHeaderError('algorithm was not specified')

	if (!parsed.params.signature) throw new InvalidHeaderError('signature was not specified')

	if (['date', 'x-date', '(created)'].every((hdr) => parsedHeaders.indexOf(hdr) < 0)) {
		throw new MissingHeaderError('no signed date header')
	}

	// Check the algorithm against the official list
	try {
		validateAlgorithm(parsed.params.algorithm as string, 'rsa')
	} catch (e) {
		if (e instanceof InvalidAlgorithmError)
			throw new InvalidParamsError(parsed.params.algorithm + ' is not ' + 'supported')
		else throw e
	}

	// Build the signingString
	for (i = 0; i < parsedHeaders.length; i++) {
		const h = parsedHeaders[i].toLowerCase()
		parsedHeaders[i] = h

		if (h === 'request-line') {
			if (!options.strict) {
				const cf = (request as { cf?: IncomingRequestCfProperties }).cf
				/*
				 * We allow headers from the older spec drafts if strict parsing isn't
				 * specified in options.
				 */
				parsed.signingString += request.method + ' ' + request.url + ' ' + cf?.httpProtocol
			} else {
				/* Strict parsing doesn't allow older draft headers. */
				throw new StrictParsingError('request-line is not a valid header ' + 'with strict parsing enabled.')
			}
		} else if (h === '(request-target)') {
			const { pathname, search } = new URL(request.url)
			parsed.signingString += '(request-target): ' + `${request.method.toLowerCase()} ${pathname}${search}`
		} else if (h === '(keyid)') {
			parsed.signingString += '(keyid): ' + parsed.params.keyId
		} else if (h === '(algorithm)') {
			parsed.signingString += '(algorithm): ' + parsed.params.algorithm
		} else if (h === '(opaque)') {
			const opaque = parsed.params.opaque
			if (opaque === undefined) {
				//@ts-expect-error -- authzHeaderName doesn't exist TOFIX
				throw new MissingHeaderError('opaque param was not in the ' + authzHeaderName + ' header')
			}
			parsed.signingString += '(opaque): ' + opaque
		} else if (h === '(created)') {
			parsed.signingString += '(created): ' + parsed.params.created
		} else if (h === '(expires)') {
			parsed.signingString += '(expires): ' + parsed.params.expires
		} else {
			const value = request.headers.get(h)
			if (value === null) throw new MissingHeaderError(h + ' was not in the request')
			parsed.signingString += h + ': ' + value
		}

		if (i + 1 < parsedHeaders.length) parsed.signingString += '\n'
	}

	// Check against the constraints
	let date
	let skew
	if (request.headers.get('date') || request.headers.has('x-date')) {
		if (request.headers.has('x-date')) {
			date = new Date(request.headers.get('x-date') as string)
		} else {
			date = new Date(request.headers.get('date') as string)
		}
		const now = new Date()
		skew = Math.abs(now.getTime() - date.getTime())

		if (skew > options.clockSkew * 1000) {
			throw new ExpiredRequestError('clock skew of ' + skew / 1000 + 's was greater than ' + options.clockSkew + 's')
		}
	}

	if (parsed.params.created && typeof parsed.params.created === 'number') {
		skew = parsed.params.created - Math.floor(Date.now() / 1000)
		if (skew > options.clockSkew) {
			throw new ExpiredRequestError(
				'Created lies in the future (with ' + 'skew ' + skew + 's greater than allowed ' + options.clockSkew + 's'
			)
		}

		if (Math.abs(skew) > options.clockSkew) {
			throw new ExpiredRequestError(
				'clock skew of ' + Math.abs(skew) + 's greater than allowed ' + options.clockSkew + 's'
			)
		}
	}

	if (parsed.params.expires && typeof parsed.params.expires === 'number') {
		const expiredSince = Math.floor(Date.now() / 1000) - parsed.params.expires
		if (expiredSince > options.clockSkew) {
			throw new ExpiredRequestError(
				'Request expired with skew ' + expiredSince + 's greater than allowed ' + options.clockSkew + 's'
			)
		}
	}

	headers.forEach(function (hdr) {
		// Remember that we already checked any headers in the params
		// were in the request, so if this passes we're good.
		if (parsedHeaders.indexOf(hdr.toLowerCase()) < 0) {
			throw new MissingHeaderError(hdr + ' was not a signed header')
		}
	})

	const algorithm = parsed.params.algorithm as string
	parsed.params.algorithm = algorithm.toLowerCase()
	parsed.algorithm = algorithm.toUpperCase()
	parsed.keyId = parsed.params.keyId as string
	parsed.opaque = parsed.params.opaque as string
	parsed.signature = parsed.params.signature as string
	parsed.params.headers = parsedHeaders
	return parsed
}
