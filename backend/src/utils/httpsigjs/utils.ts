// Copyright 2012 Joyent, Inc.  All rights reserved.
export const HASH_ALGOS = new Set<string>(['sha1', 'sha256', 'sha512'])

export const PK_ALGOS = new Set<string>(['rsa', 'dsa', 'ecdsa'])

export const HEADER = {
	AUTH: 'authorization',
	SIG: 'signature',
}

export class HttpSignatureError extends Error {
	constructor(message: string, caller: any) {
		super(message)
		if (Error.captureStackTrace) Error.captureStackTrace(this, caller || HttpSignatureError)

		this.message = message
		this.name = caller.name
	}
}

export class InvalidAlgorithmError extends HttpSignatureError {
	constructor(message: string) {
		super(message, InvalidAlgorithmError)
	}
}

/**
 * @param algorithm {String} the algorithm of the signature
 * @param publicKeyType {String?} fallback algorithm (public key type) for
 *                                hs2019
 * @returns {[string, string]}
 */
export function validateAlgorithm(algorithm: string, publicKeyType?: string): [string, string] {
	const alg = algorithm.toLowerCase().split('-')

	if (alg[0] === 'hs2019') {
		return publicKeyType !== undefined ? validateAlgorithm(publicKeyType + '-sha256') : ['hs2019', 'sha256']
	}

	if (alg.length !== 2) {
		throw new InvalidAlgorithmError(alg[0].toUpperCase() + ' is not a ' + 'valid algorithm')
	}

	if (alg[0] !== 'hmac' && !PK_ALGOS.has(alg[0])) {
		throw new InvalidAlgorithmError(alg[0].toUpperCase() + ' type keys ' + 'are not supported')
	}

	if (!HASH_ALGOS.has(alg[1])) {
		throw new InvalidAlgorithmError(alg[1].toUpperCase() + ' is not a ' + 'supported hash algorithm')
	}

	return alg as [string, string]
}
